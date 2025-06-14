/**
 * Output File Handling Logic
 */

import { App } from 'obsidian';
import { FileOperations, FileUtils } from '../../file-operations';
import { PathResolver, PathUtils } from '../../path-resolver';
import { 
    PipelineStep,
    ProcessingContext,
    YamlResponseSection,
    FileMetadata
} from '../../../types';
import { createLogger } from '../../../logger';

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

    async save(
        section: YamlResponseSection,
        step: PipelineStep,
        context: ProcessingContext
    ): Promise<string> {
        // Determine effective filename to use for path resolution
        const effectiveFilename = this.resolveEffectiveFilename(section.filename, context);
        
        // Resolve output path with the effective filename
        const pathContext = {
            filename: effectiveFilename,
            timestamp: context.timestamp,
            date: context.date,
            stepId: context.stepId
        };

        const outputResult = PathResolver.resolvePath(step.output, pathContext);
        const outputPath = outputResult.resolvedPath;

        try {
            // Generate standardized frontmatter
            const metadata: FileMetadata = {
                source: context.archivePath,
                processed: new Date().toISOString(),
                step: context.stepId,
                nextStep: section.nextStep,
                pipeline: 'audio-processing'
            };

            // Create frontmatter
            const frontmatterLines = ['---'];
            frontmatterLines.push(`source: "${metadata.source}"`);
            frontmatterLines.push(`processed: "${metadata.processed}"`);
            frontmatterLines.push(`step: "${metadata.step}"`);
            if (metadata.nextStep) {
                frontmatterLines.push(`nextStep: "${metadata.nextStep}"`);
            }
            if (metadata.pipeline) {
                frontmatterLines.push(`pipeline: "${metadata.pipeline}"`);
            }
            frontmatterLines.push('---');
            frontmatterLines.push('');

            // Combine frontmatter with direct API response content
            const finalContent = frontmatterLines.join('\n') + section.content;

            // Debug logging: Saving output file
            logger.debug("Saving output file", {
                outputPath: outputPath,
                contentLength: finalContent.length,
                frontmatterUsed: metadata,
                filenameSource: this.getFilenameSource(section.filename, context),
                sectionFilename: section.filename,
                effectiveFilename: effectiveFilename,
                resolvedFilename: pathContext.filename
            });

            // Write content to file
            await this.fileOps.writeFile(outputPath, finalContent, {
                createDirectories: true,
                overwrite: true
            });

            logger.debug(`Output file saved with direct content: ${outputPath}`);
            return outputPath;

        } catch (error) {
            logger.error(`Failed to save output file: ${outputPath}`, error);
            throw error;
        }
    }

    async saveMultiple(
        sections: YamlResponseSection[],
        step: PipelineStep,
        context: ProcessingContext
    ): Promise<{ [filename: string]: string }> {
        const savedFiles: { [filename: string]: string } = {};

        logger.debug("Saving multiple sections", {
            sectionCount: sections.length,
            stepId: context.stepId,
            stepOutput: step.output
        });

        for (const section of sections) {
            try {
                const outputPath = await this.save(section, step, context);
                savedFiles[section.filename] = outputPath;
            } catch (error) {
                logger.error(`Failed to save section: ${section.filename}`, error);
                // Continue processing other sections even if one fails
            }
        }

        logger.debug("Multiple sections save complete", {
            successCount: Object.keys(savedFiles).length,
            totalCount: sections.length,
            savedFiles: savedFiles
        });

        return savedFiles;
    }

    /**
     * Handle directory-only outputs for multi-file responses
     */
    async saveToDirectory(
        sections: YamlResponseSection[],
        step: PipelineStep,
        context: ProcessingContext
    ): Promise<{ [filename: string]: string }> {
        const savedFiles: { [filename: string]: string } = {};

        // Check if output is a directory pattern
        const isDirectoryOutput = step.output.endsWith('/') || !step.output.includes('{filename}');

        logger.debug("Saving to directory", {
            sectionCount: sections.length,
            stepOutput: step.output,
            isDirectoryOutput: isDirectoryOutput,
            stepId: context.stepId
        });

        for (const section of sections) {
            try {
                let outputPath: string;
                const effectiveFilename = this.resolveEffectiveFilename(section.filename, context);

                if (isDirectoryOutput) {
                    // For directory outputs, combine directory with section filename
                    const directoryPath = PathResolver.resolvePath(step.output, {
                        timestamp: context.timestamp,
                        date: context.date,
                        stepId: context.stepId
                    }).resolvedPath;
                    
                    outputPath = PathUtils.join(directoryPath, section.filename);
                } else {
                    // For file pattern outputs, use the effective filename as the basis
                    const pathContext = {
                        filename: effectiveFilename,
                        timestamp: context.timestamp,
                        date: context.date,
                        stepId: context.stepId
                    };
                    outputPath = PathResolver.resolvePath(step.output, pathContext).resolvedPath;
                }

                // Generate metadata and content
                const metadata: FileMetadata = {
                    source: context.archivePath,
                    processed: new Date().toISOString(),
                    step: context.stepId,
                    nextStep: section.nextStep,
                    pipeline: 'audio-processing'
                };

                // Create frontmatter
                const frontmatterLines = ['---'];
                frontmatterLines.push(`source: "${metadata.source}"`);
                frontmatterLines.push(`processed: "${metadata.processed}"`);
                frontmatterLines.push(`step: "${metadata.step}"`);
                if (metadata.nextStep) {
                    frontmatterLines.push(`nextStep: "${metadata.nextStep}"`);
                }
                if (metadata.pipeline) {
                    frontmatterLines.push(`pipeline: "${metadata.pipeline}"`);
                }
                frontmatterLines.push('---');
                frontmatterLines.push('');

                // Combine frontmatter with direct API response content
                const finalContent = frontmatterLines.join('\n') + section.content;

                // Debug logging: Saving section to directory
                logger.debug("Saving section to directory", {
                    outputPath: outputPath,
                    contentLength: finalContent.length,
                    frontmatterUsed: metadata,
                    filenameSource: this.getFilenameSource(section.filename, context),
                    sectionFilename: section.filename,
                    effectiveFilename: effectiveFilename,
                    isDirectoryOutput: isDirectoryOutput
                });

                // Write content to file
                await this.fileOps.writeFile(outputPath, finalContent, {
                    createDirectories: true,
                    overwrite: true
                });

                savedFiles[section.filename] = outputPath;
                logger.debug(`Section saved to directory: ${outputPath}`);

            } catch (error) {
                logger.error(`Failed to save section to directory: ${section.filename}`, error);
                // Continue processing other sections even if one fails
            }
        }

        logger.debug("Directory save complete", {
            successCount: Object.keys(savedFiles).length,
            totalCount: sections.length,
            savedFiles: savedFiles
        });

        return savedFiles;
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