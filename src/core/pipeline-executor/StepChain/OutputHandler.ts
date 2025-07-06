/**
 * Simplified Output File Handling Logic for Directory-Only System
 */

import { App } from 'obsidian';
import { FileOperations } from '../../file-operations';
import { normalizeDirectoryPath } from '../../path-operations/normalize-directory-path';
import { buildOutputPath } from '../../path-operations/build-output-path';
import { FilenameResolver } from '../../FilenameResolver';
import { ProcessedSection } from '../../../api/chat-types';
import { 
    PipelineStep,
    ProcessingContext,
    FileMetadata,
    RoutingAwareOutput,
    isRoutingAwareOutput
} from '../../../types';
import { createLogger } from '../../../logger';
import { ContentPipelineError } from '../../../errors';

const logger = createLogger('OutputHandler');

export class OutputHandler {
    private app: App;
    private fileOps: FileOperations;

    constructor(app: App) {
        this.app = app;
        this.fileOps = new FileOperations(app);
    }

    /**
     * Resolve output directory based on routing decision and step configuration
     * 
     * All outputs are now directories, so this returns a directory path ending with '/'
     */
    resolveOutputDirectory(step: PipelineStep, nextStep?: string): string {
        // Handle string output (single directory path)
        if (typeof step.output === 'string') {
            logger.debug('Using string output directory', { 
                output: step.output, 
                nextStep 
            });
            
            // Ensure it's formatted as a directory path
            return normalizeDirectoryPath(step.output);
        }

        // Handle routing-aware output (multiple directory paths)
        if (isRoutingAwareOutput(step.output)) {
            const routingOutput = step.output as RoutingAwareOutput;
            
            // Priority 1: Use nextStep if provided and valid
            if (nextStep && routingOutput[nextStep]) {
                logger.debug('Using routing-aware output directory for nextStep', { 
                    nextStep, 
                    outputPath: routingOutput[nextStep] 
                });
                return normalizeDirectoryPath(routingOutput[nextStep]);
            }

            // Priority 2: Use default fallback if nextStep is invalid/missing
            if (routingOutput.default) {
                logger.debug('Using default fallback output directory', { 
                    nextStep: nextStep || 'undefined',
                    defaultPath: routingOutput.default,
                    availableRoutes: Object.keys(routingOutput).filter(k => k !== 'default')
                });
                return normalizeDirectoryPath(routingOutput.default);
            }

            // Priority 3: If no default, throw error
            const availableRoutes = Object.keys(routingOutput).filter(k => k !== 'default');
            throw new ContentPipelineError(`No valid output directory found for routing decision: nextStep='${nextStep}', no default fallback configured`);
        }

        // Should not reach here with proper typing, but handle gracefully
        throw new ContentPipelineError('Invalid output configuration - not string or routing-aware object');
    }

    async save(
        section: ProcessedSection,
        step: PipelineStep,
        context: ProcessingContext
    ): Promise<string> {
        try {
            // Resolve output directory based on routing decision
            const outputDirectory = this.resolveOutputDirectory(step, section.nextStep);
            
            // Determine effective filename using FilenameResolver
            const effectiveFilename = FilenameResolver.resolveOutputFilename(
                section.filename,
                context.filename,
                context.stepId
            );
            
            // Get appropriate file extension for the step type
            const extension = FilenameResolver.getExtensionForStepType(context.stepId);
            
            // Build complete output path using path operations
            const outputPath = buildOutputPath(
                outputDirectory,
                effectiveFilename,
                extension
            );

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

            // Debug logging: Saving output file with simplified system
            logger.debug("Saving output file with simplified system", {
                outputPath: outputPath,
                outputDirectory: outputDirectory,
                nextStep: section.nextStep,
                contentLength: finalContent.length,
                frontmatterUsed: metadata,
                filenameSource: FilenameResolver.getFilenameSource(section.filename, context.filename),
                sectionFilename: section.filename,
                effectiveFilename: effectiveFilename,
                extension: extension
            });

            // Ensure directory exists before writing file
            await this.fileOps.ensureDirectoryForFile(outputPath);

            // Write content to file
            await this.fileOps.writeFile(outputPath, finalContent, {
                createDirectories: true,
                overwrite: true
            });

            logger.debug(`Output file saved with simplified system: ${outputPath}`);
            return outputPath;

        } catch (error) {
            logger.error(`Failed to save output file`, error);
            throw error;
        }
    }

    async saveMultiple(
        sections: ProcessedSection[],
        step: PipelineStep,
        context: ProcessingContext
    ): Promise<{ [filename: string]: string }> {
        const savedFiles: { [filename: string]: string } = {};

        logger.debug("Saving multiple sections with simplified system", {
            sectionCount: sections.length,
            stepId: context.stepId,
            stepOutput: step.output,
            isRoutingAware: isRoutingAwareOutput(step.output)
        });

        for (const section of sections) {
            try {
                // Create section-specific context with routing decision metadata
                const sectionContext = this.createSectionContext(context, section, step);
                
                // Use unified save method - no need for special directory handling
                const outputPath = await this.save(section, step, sectionContext);
                savedFiles[section.filename] = outputPath;
            } catch (error) {
                logger.error(`Failed to save section: ${section.filename}`, error);
                // Continue processing other sections even if one fails
            }
        }

        logger.debug("Multiple sections save complete with simplified system", {
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
                resolvedOutputPath: this.resolveOutputDirectory(step, section.nextStep),
                availableOptions
            }
        };
    }
}
