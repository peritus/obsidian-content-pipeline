/**
 * Output File Handling Logic with Routing-Aware Output Support
 */

import { App } from 'obsidian';
import { FileOperations, FileUtils } from '../../file-operations';
import { PathResolver, PathUtils } from '../../path-resolver';
import { ProcessedSection } from '../../../api/chat-types';
import { 
    PipelineStep,
    ProcessingContext,
    FileMetadata,
    RoutingAwareOutput,
    isRoutingAwareOutput
} from '../../../types';
import { createLogger } from '../../../logger';
import { ErrorFactory } from '../../../error-handler';

const logger = createLogger('OutputHandler');

/**
 * Generic/default filenames that should trigger fallback to original filename
 */
const GENERIC_FILENAMES = new Set([
    'response',
    'response.md',
    'output',
    'output.md',
    'untitled',
    'untitled.md',
    'result',
    'result.md',
    'document',
    'document.md'
]);

export class OutputHandler {
    private app: App;
    private fileOps: FileOperations;

    constructor(app: App) {
        this.app = app;
        this.fileOps = new FileOperations(app);
    }

    /**
     * Resolve output path based on routing decision and step configuration
     */
    resolveOutputPath(step: PipelineStep, nextStep?: string): string {
        // Handle backward compatibility with string output
        if (typeof step.output === 'string') {
            logger.debug('Using string output (backward compatible)', { 
                output: step.output, 
                nextStep 
            });
            return step.output;
        }

        // Handle routing-aware output
        if (isRoutingAwareOutput(step.output)) {
            const routingOutput = step.output as RoutingAwareOutput;
            
            // Priority 1: Use nextStep if provided and valid
            if (nextStep && routingOutput[nextStep]) {
                logger.debug('Using routing-aware output for nextStep', { 
                    nextStep, 
                    outputPath: routingOutput[nextStep] 
                });
                return routingOutput[nextStep];
            }

            // Priority 2: Use default fallback if nextStep is invalid/missing
            if (routingOutput.default) {
                logger.debug('Using default fallback output', { 
                    nextStep: nextStep || 'undefined',
                    defaultPath: routingOutput.default,
                    availableRoutes: Object.keys(routingOutput).filter(k => k !== 'default')
                });
                return routingOutput.default;
            }

            // Priority 3: If no default, throw error
            const availableRoutes = Object.keys(routingOutput).filter(k => k !== 'default');
            throw ErrorFactory.routing(
                `No valid output path found for routing decision: nextStep='${nextStep}', no default fallback configured`,
                'Cannot determine where to save output file - routing configuration is incomplete',
                { 
                    nextStep, 
                    availableRoutes,
                    routingConfig: routingOutput 
                },
                [
                    'Add a "default" fallback path to your output routing configuration',
                    `Ensure nextStep value matches one of: ${availableRoutes.join(', ')}`,
                    'Check your routing prompt instructions for clarity'
                ]
            );
        }

        // Should not reach here with proper typing, but handle gracefully
        throw ErrorFactory.validation(
            'Invalid output configuration - not string or routing-aware object',
            'Output configuration must be either a string path or routing-aware object',
            { stepOutput: step.output },
            ['Check your pipeline configuration format', 'Ensure output is string or object with routing paths']
        );
    }

    async save(
        section: ProcessedSection,
        step: PipelineStep,
        context: ProcessingContext
    ): Promise<string> {
        // Resolve output path based on routing decision
        const outputPattern = this.resolveOutputPath(step, section.nextStep);
        
        // Determine effective filename to use for path resolution
        const effectiveFilename = this.resolveEffectiveFilename(section.filename, context);
        
        // Resolve output path with the effective filename
        const pathContext = {
            filename: effectiveFilename,
            timestamp: context.timestamp,
            date: context.date,
            stepId: context.stepId
        };

        const outputResult = PathResolver.resolvePath(outputPattern, pathContext);
        const outputPath = outputResult.resolvedPath;

        try {
            // Generate clean frontmatter with essential metadata only
            const metadata: FileMetadata = {
                source: context.archivePath,
                processed: new Date().toISOString(),
                step: context.stepId,
                nextStep: section.nextStep
            };

            // Create clean frontmatter
            const frontmatterLines = ['---'];
            frontmatterLines.push(`source: "[[${metadata.source}]]"`);
            frontmatterLines.push(`processed: "${metadata.processed}"`);
            frontmatterLines.push(`step: "${metadata.step}"`);
            if (metadata.nextStep) {
                frontmatterLines.push(`nextStep: "${metadata.nextStep}"`);
            }
            frontmatterLines.push('---');
            frontmatterLines.push('');

            // Combine frontmatter with direct API response content
            const finalContent = frontmatterLines.join('\n') + section.content;

            // Debug logging: Saving output file with routing info
            logger.debug("Saving output file with routing", {
                outputPath: outputPath,
                outputPattern: outputPattern,
                nextStep: section.nextStep,
                usedDefaultFallback: context.routingDecision?.usedDefaultFallback,
                contentLength: finalContent.length,
                frontmatterUsed: metadata,
                filenameSource: this.getFilenameSource(section.filename, context),
                sectionFilename: section.filename,
                effectiveFilename: effectiveFilename,
                resolvedFilename: pathContext.filename
            });

            // Ensure directory exists before writing file
            await this.fileOps.ensureDirectoryForFile(outputPath);

            // Write content to file
            await this.fileOps.writeFile(outputPath, finalContent, {
                createDirectories: true,
                overwrite: true
            });

            logger.debug(`Output file saved with routing-aware path: ${outputPath}`);
            return outputPath;

        } catch (error) {
            logger.error(`Failed to save output file: ${outputPath}`, error);
            throw error;
        }
    }

    async saveMultiple(
        sections: ProcessedSection[],
        step: PipelineStep,
        context: ProcessingContext
    ): Promise<{ [filename: string]: string }> {
        const savedFiles: { [filename: string]: string } = {};

        logger.debug("Saving multiple sections with routing", {
            sectionCount: sections.length,
            stepId: context.stepId,
            stepOutput: step.output,
            isRoutingAware: isRoutingAwareOutput(step.output)
        });

        for (const section of sections) {
            try {
                // Update context with routing decision for this section
                const sectionContext = this.createSectionContext(context, section, step);
                const outputPath = await this.save(section, step, sectionContext);
                savedFiles[section.filename] = outputPath;
            } catch (error) {
                logger.error(`Failed to save section: ${section.filename}`, error);
                // Continue processing other sections even if one fails
            }
        }

        logger.debug("Multiple sections save complete with routing", {
            successCount: Object.keys(savedFiles).length,
            totalCount: sections.length,
            savedFiles: savedFiles
        });

        return savedFiles;
    }

    /**
     * Handle directory-only outputs for multi-file responses with routing support
     */
    async saveToDirectory(
        sections: ProcessedSection[],
        step: PipelineStep,
        context: ProcessingContext
    ): Promise<{ [filename: string]: string }> {
        const savedFiles: { [filename: string]: string } = {};

        logger.debug("Saving to directory with routing", {
            sectionCount: sections.length,
            stepOutput: step.output,
            stepId: context.stepId,
            isRoutingAware: isRoutingAwareOutput(step.output)
        });

        for (const section of sections) {
            try {
                // Resolve output path based on routing decision for this section
                const outputPattern = this.resolveOutputPath(step, section.nextStep);
                
                // Check if output is a directory pattern
                const isDirectoryOutput = outputPattern.endsWith('/') || !outputPattern.includes('{filename}');
                const effectiveFilename = this.resolveEffectiveFilename(section.filename, context);

                let outputPath: string;

                if (isDirectoryOutput) {
                    // For directory outputs, handle specially to preserve directory nature
                    let directoryPath: string;
                    
                    if (outputPattern.endsWith('/')) {
                        // Pattern like "inbox/summary-personal/" - remove trailing slash before resolving
                        const directoryPatternBase = outputPattern.slice(0, -1);
                        directoryPath = PathResolver.resolvePath(directoryPatternBase, {
                            timestamp: context.timestamp,
                            date: context.date,
                            stepId: context.stepId
                        }).resolvedPath;
                    } else {
                        // Pattern without filename variable, like "inbox/summary-personal"
                        directoryPath = PathResolver.resolvePath(outputPattern, {
                            timestamp: context.timestamp,
                            date: context.date,
                            stepId: context.stepId
                        }).resolvedPath;
                    }
                    
                    // Ensure we have a valid filename from LLM response
                    const filename = section.filename || `${effectiveFilename}.md`;
                    outputPath = PathUtils.join(directoryPath, filename);
                } else {
                    // For file pattern outputs, use the effective filename as the basis
                    const pathContext = {
                        filename: effectiveFilename,
                        timestamp: context.timestamp,
                        date: context.date,
                        stepId: context.stepId
                    };
                    outputPath = PathResolver.resolvePath(outputPattern, pathContext).resolvedPath;
                }

                // Generate clean metadata with essential information only
                const metadata: FileMetadata = {
                    source: context.archivePath,
                    processed: new Date().toISOString(),
                    step: context.stepId,
                    nextStep: section.nextStep
                };

                // Create clean frontmatter
                const frontmatterLines = ['---'];
                frontmatterLines.push(`source: "[[${metadata.source}]]"`);
                frontmatterLines.push(`processed: "${metadata.processed}"`);
                frontmatterLines.push(`step: "${metadata.step}"`);
                if (metadata.nextStep) {
                    frontmatterLines.push(`nextStep: "${metadata.nextStep}"`);
                }
                frontmatterLines.push('---');
                frontmatterLines.push('');

                // Combine frontmatter with direct API response content
                const finalContent = frontmatterLines.join('\n') + section.content;

                // Debug logging: Saving section to directory with routing
                logger.debug("Saving section to directory with routing", {
                    outputPath: outputPath,
                    outputPattern: outputPattern,
                    nextStep: section.nextStep,
                    usedDefaultFallback: context.routingDecision?.usedDefaultFallback,
                    contentLength: finalContent.length,
                    frontmatterUsed: metadata,
                    filenameSource: this.getFilenameSource(section.filename, context),
                    sectionFilename: section.filename,
                    effectiveFilename: effectiveFilename,
                    isDirectoryOutput: isDirectoryOutput
                });

                // Ensure directory exists before writing file
                await this.fileOps.ensureDirectoryForFile(outputPath);

                // Write content to file
                await this.fileOps.writeFile(outputPath, finalContent, {
                    createDirectories: true,
                    overwrite: true
                });

                savedFiles[section.filename] = outputPath;
                logger.debug(`Section saved to directory with routing: ${outputPath}`);

            } catch (error) {
                logger.error(`Failed to save section to directory: ${section.filename}`, error);
                // Continue processing other sections even if one fails
            }
        }

        logger.debug("Directory save complete with routing", {
            successCount: Object.keys(savedFiles).length,
            totalCount: sections.length,
            savedFiles: savedFiles
        });

        return savedFiles;
    }

    /**
     * Create section-specific context with routing decision metadata
     */
    private createSectionContext(
        baseContext: ProcessingContext, 
        section: ProcessedSection, 
        step: PipelineStep
    ): ProcessingContext {
        // Determine if default fallback was used
        let usedDefaultFallback = false;
        let availableOptions: string[] = [];

        if (isRoutingAwareOutput(step.output)) {
            const routingOutput = step.output as RoutingAwareOutput;
            availableOptions = Object.keys(routingOutput).filter(k => k !== 'default');
            
            // Check if nextStep is valid or if we're using default
            usedDefaultFallback = !section.nextStep || !routingOutput[section.nextStep];
        }

        return {
            ...baseContext,
            routingDecision: {
                nextStep: section.nextStep,
                usedDefaultFallback,
                resolvedOutputPath: this.resolveOutputPath(step, section.nextStep),
                availableOptions
            }
        };
    }

    /**
     * Determine the effective filename to use for path resolution
     * 
     * Priority order:
     * 1. If LLM provided a meaningful filename (not generic), use it
     * 2. Otherwise, fall back to the original input filename from context
     */
    private resolveEffectiveFilename(sectionFilename: string | undefined, context: ProcessingContext): string {
        // Check if LLM provided a meaningful filename
        if (sectionFilename && this.isValidCustomFilename(sectionFilename)) {
            // Use the basename of the LLM-provided filename (without extension)
            return PathUtils.getBasename(sectionFilename);
        }

        // Fall back to original input filename from context
        return context.filename;
    }

    /**
     * Check if a filename is a valid custom filename (not generic)
     */
    private isValidCustomFilename(filename: string): boolean {
        if (!filename || typeof filename !== 'string') {
            return false;
        }

        // Get the basename without extension for comparison
        const basename = PathUtils.getBasename(filename).toLowerCase();
        
        // Check if it's a generic filename
        return !GENERIC_FILENAMES.has(basename) && !GENERIC_FILENAMES.has(filename.toLowerCase());
    }

    /**
     * Get a description of the filename source for logging
     */
    private getFilenameSource(sectionFilename: string | undefined, context: ProcessingContext): string {
        if (sectionFilename && this.isValidCustomFilename(sectionFilename)) {
            return "llm-provided";
        }
        return "original-input";
    }
}