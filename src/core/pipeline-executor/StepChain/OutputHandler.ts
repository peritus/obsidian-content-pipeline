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
        // Resolve output path with filename from section
        const pathContext = {
            filename: PathUtils.getBasename(section.filename || 'output'),
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
            const content = frontmatterLines.join('\n') + section.content;

            // Write content to file
            await this.fileOps.writeFile(outputPath, content, {
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

        for (const section of sections) {
            try {
                const outputPath = await this.save(section, step, context);
                savedFiles[section.filename] = outputPath;
            } catch (error) {
                logger.error(`Failed to save section: ${section.filename}`, error);
                // Continue processing other sections even if one fails
            }
        }

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

        for (const section of sections) {
            try {
                let outputPath: string;

                if (isDirectoryOutput) {
                    // For directory outputs, combine directory with section filename
                    const directoryPath = PathResolver.resolvePath(step.output, {
                        timestamp: context.timestamp,
                        date: context.date,
                        stepId: context.stepId
                    }).resolvedPath;
                    
                    outputPath = PathUtils.join(directoryPath, section.filename);
                } else {
                    // For file pattern outputs, use the section filename as the basis
                    const pathContext = {
                        filename: PathUtils.getBasename(section.filename),
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
                const content = frontmatterLines.join('\n') + section.content;

                // Write content to file
                await this.fileOps.writeFile(outputPath, content, {
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

        return savedFiles;
    }
}