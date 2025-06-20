/**
 * Whisper-specific step processing with Routing-Aware Output Support (v2.0)
 */

import { App } from 'obsidian';
import { PathUtils, PathResolver } from '../path-resolver';
import { FileOperations } from '../file-operations';
import { WhisperClient } from '../../api';
import { 
    FileInfo, 
    ProcessingResult, 
    ProcessingStatus, 
    ResolvedPipelineStep,
    ProcessingContext,
    FileMetadata,
    isRoutingAwareOutput,
    RoutingAwareOutput
} from '../../types';
import { ErrorFactory } from '../../error-handler';
import { createLogger } from '../../logger';

const logger = createLogger('WhisperStep');

export class WhisperStepProcessor {
    private app: App;
    private fileOps: FileOperations;

    constructor(app: App) {
        this.app = app;
        this.fileOps = new FileOperations(app);
    }

    async executeWhisperStep(
        stepId: string,
        fileInfo: FileInfo,
        resolvedStep: ResolvedPipelineStep
    ): Promise<ProcessingResult> {
        const startTime = new Date();

        try {
            logger.info(`Starting Whisper transcription: ${fileInfo.name} with ${resolvedStep.modelConfig.model}`);

            // Read audio file
            const audioBuffer = await this.readAudioFile(fileInfo.path);
            
            // Create Whisper client and transcribe using resolved model config
            const whisperClient = new WhisperClient({
                apiKey: resolvedStep.modelConfig.apiKey,
                baseUrl: resolvedStep.modelConfig.baseUrl,
                organization: resolvedStep.modelConfig.organization
            });

            const transcriptionResult = await whisperClient.transcribeAudio(
                audioBuffer,
                fileInfo.name,
                { responseFormat: 'text' }
            );

            // Archive original file first and capture archive path
            const archivePath = await this.archiveFile(fileInfo.path, resolvedStep.archive, fileInfo);

            // Create processing context for routing-aware output resolution
            const context: ProcessingContext = {
                filename: PathUtils.getBasename(fileInfo.path),
                timestamp: new Date().toISOString(),
                date: new Date().toISOString().split('T')[0],
                archivePath,
                stepId,
                inputPath: fileInfo.path,
                outputPath: '' // Will be resolved based on routing
            };

            // Determine next step and routing for Whisper step
            let nextStep: string | undefined;
            let usedDefaultFallback = false;
            let resolvedOutputPath: string;

            // For Whisper steps, determine routing based on routing-aware output configuration
            const availableNextSteps = this.getAvailableNextSteps(resolvedStep);
            if (availableNextSteps.length > 0) {
                // For Whisper, typically take the first (or only) available next step
                // Could be enhanced with content analysis in the future
                nextStep = availableNextSteps[0];
                logger.debug(`Whisper step routing to: ${nextStep}`);
            }

            // Resolve output path using routing-aware logic
            resolvedOutputPath = this.resolveOutputPath(resolvedStep, nextStep);

            // Add routing decision to context
            context.routingDecision = {
                nextStep,
                usedDefaultFallback,
                resolvedOutputPath,
                availableOptions: availableNextSteps
            };

            // Format and save output with routing-aware metadata
            const outputContent = this.formatTranscriptionOutput(
                transcriptionResult.text, 
                fileInfo, 
                stepId, 
                archivePath, 
                context
            );
            
            const outputPath = PathResolver.resolvePath(resolvedOutputPath, {
                filename: context.filename,
                timestamp: context.timestamp,
                date: context.date,
                stepId: context.stepId
            }).resolvedPath;
            
            await this.fileOps.writeFile(outputPath, outputContent, {
                createDirectories: true,
                overwrite: true
            });

            logger.info(`Whisper transcription completed with routing: ${fileInfo.name} → ${outputPath}, nextStep: ${nextStep || 'none'}`);

            // Create routing decision metadata for result
            const routingDecision = {
                availableOptions: availableNextSteps,
                chosenOption: nextStep,
                usedDefaultFallback,
                resolvedOutputPath: outputPath,
                routingConfig: this.getRoutingConfig(resolvedStep)
            };

            return {
                inputFile: fileInfo,
                status: ProcessingStatus.COMPLETED,
                outputFiles: [outputPath],
                archivePath,
                startTime,
                endTime: new Date(),
                stepId,
                nextStep,
                routingDecision
            };

        } catch (error) {
            logger.error(`Whisper transcription failed: ${fileInfo.name}`, error);
            throw error;
        }
    }

    /**
     * Get available next steps from routing-aware output only
     */
    private getAvailableNextSteps(resolvedStep: ResolvedPipelineStep): string[] {
        // Use routing-aware output keys if available
        if (resolvedStep.routingAwareOutput && isRoutingAwareOutput(resolvedStep.routingAwareOutput)) {
            return Object.keys(resolvedStep.routingAwareOutput).filter(key => key !== 'default');
        }

        // No routing-aware output configured
        return [];
    }

    /**
     * Resolve output path using routing-aware logic (similar to OutputHandler)
     */
    private resolveOutputPath(resolvedStep: ResolvedPipelineStep, nextStep?: string): string {
        // Check if step has routing-aware output configuration
        const output = resolvedStep.routingAwareOutput || resolvedStep.output;

        // Handle backward compatibility with string output
        if (typeof output === 'string') {
            logger.debug('Whisper using string output (backward compatible)', { 
                output, 
                nextStep 
            });
            return output;
        }

        // Handle routing-aware output
        if (isRoutingAwareOutput(output)) {
            const routingOutput = output as RoutingAwareOutput;
            
            // Priority 1: Use nextStep if provided and valid
            if (nextStep && routingOutput[nextStep]) {
                logger.debug('Whisper using routing-aware output for nextStep', { 
                    nextStep, 
                    outputPath: routingOutput[nextStep] 
                });
                return routingOutput[nextStep];
            }

            // Priority 2: Use default fallback if nextStep is invalid/missing
            if (routingOutput.default) {
                logger.debug('Whisper using default fallback output', { 
                    nextStep: nextStep || 'undefined',
                    defaultPath: routingOutput.default,
                    availableRoutes: Object.keys(routingOutput).filter(k => k !== 'default')
                });
                return routingOutput.default;
            }

            // Priority 3: If no default, throw error
            const availableRoutes = Object.keys(routingOutput).filter(k => k !== 'default');
            throw ErrorFactory.routing(
                `Whisper step: No valid output path found for routing decision: nextStep='${nextStep}', no default fallback configured`,
                'Cannot determine where to save Whisper output file - routing configuration is incomplete',
                { 
                    nextStep, 
                    availableRoutes,
                    routingConfig: routingOutput 
                },
                [
                    'Add a "default" fallback path to your Whisper step output routing configuration',
                    `Ensure nextStep value matches one of: ${availableRoutes.join(', ')}`,
                    'Consider using simple string output for Whisper steps if routing is not needed'
                ]
            );
        }

        // Fallback to resolved step output as string
        return resolvedStep.output;
    }

    /**
     * Get routing configuration for metadata
     */
    private getRoutingConfig(resolvedStep: ResolvedPipelineStep): RoutingAwareOutput | undefined {
        const output = resolvedStep.routingAwareOutput || resolvedStep.output;
        return isRoutingAwareOutput(output) ? output as RoutingAwareOutput : undefined;
    }

    private async readAudioFile(filePath: string): Promise<ArrayBuffer> {
        try {
            const file = this.app.vault.getAbstractFileByPath(filePath);
            if (!file) {
                throw new Error(`File not found: ${filePath}`);
            }

            return await this.app.vault.readBinary(file as any);

        } catch (error) {
            throw ErrorFactory.fileSystem(
                `Failed to read audio file: ${error instanceof Error ? error.message : String(error)}`,
                'Cannot read audio file for transcription',
                { filePath },
                ['Check file exists', 'Verify file permissions']
            );
        }
    }

    private formatTranscriptionOutput(
        text: string, 
        fileInfo: FileInfo, 
        stepId: string, 
        archivePath: string,
        context: ProcessingContext
    ): string {
        const timestamp = new Date().toISOString();
        
        // Create comprehensive metadata with routing information
        const metadata: FileMetadata = {
            source: archivePath,
            processed: timestamp,
            step: stepId,
            nextStep: context.routingDecision?.nextStep,
            usedDefaultRouting: context.routingDecision?.usedDefaultFallback,
            routingDecision: context.routingDecision ? {
                availableOptions: context.routingDecision.availableOptions,
                chosenOption: context.routingDecision.nextStep,
                fallbackUsed: context.routingDecision.usedDefaultFallback
            } : undefined
        };

        // Build frontmatter with routing information
        const frontmatterLines = ['---'];
        frontmatterLines.push(`source: "[[${metadata.source}]]"`);
        frontmatterLines.push(`processed: "${metadata.processed}"`);
        frontmatterLines.push(`step: "${metadata.step}"`);
        if (metadata.nextStep) {
            frontmatterLines.push(`nextStep: "${metadata.nextStep}"`);
        }
        if (metadata.usedDefaultRouting !== undefined) {
            frontmatterLines.push(`usedDefaultRouting: ${metadata.usedDefaultRouting}`);
        }
        if (metadata.routingDecision) {
            frontmatterLines.push(`routingDecision:`);
            frontmatterLines.push(`  availableOptions: [${metadata.routingDecision.availableOptions.map(opt => `"${opt}"`).join(', ')}]`);
            if (metadata.routingDecision.chosenOption) {
                frontmatterLines.push(`  chosenOption: "${metadata.routingDecision.chosenOption}"`);
            }
            frontmatterLines.push(`  fallbackUsed: ${metadata.routingDecision.fallbackUsed}`);
        }
        frontmatterLines.push('---');
        frontmatterLines.push('');

        return frontmatterLines.join('\n') + text;
    }

    private async archiveFile(sourcePath: string, archivePattern: string, fileInfo: FileInfo): Promise<string> {
        try {
            // Archive pattern should be step-based: inbox/archive/{stepId}
            const archivePath = archivePattern + '/' + fileInfo.name;
            
            // Ensure archive directory exists
            const archiveDir = PathUtils.getDirectory(archivePath);
            if (archiveDir) {
                await this.fileOps.ensureDirectory(archiveDir);
            }

            // Generate unique archive path to handle conflicts
            const finalArchivePath = await this.generateUniqueFilename(archivePath);

            // Move file to archive
            const sourceFile = this.app.vault.getAbstractFileByPath(sourcePath);
            if (sourceFile) {
                await this.app.vault.rename(sourceFile, finalArchivePath);
                logger.debug(`File archived: ${sourcePath} → ${finalArchivePath}`);
                return finalArchivePath;
            } else {
                logger.warn(`Source file not found for archiving: ${sourcePath}`);
                return sourcePath; // Return original path if source not found
            }

        } catch (error) {
            logger.warn(`Failed to archive file: ${sourcePath}`, error);
            return sourcePath; // Return original path if archiving fails
        }
    }

    /**
     * Generate a unique filename to avoid conflicts (similar to FileArchiver)
     */
    private async generateUniqueFilename(basePath: string): Promise<string> {
        let counter = 0;
        let testPath = basePath;

        while (this.fileExists(testPath)) {
            counter++;
            const dir = PathUtils.getDirectory(basePath);
            const basename = PathUtils.getBasename(basePath);
            const extension = PathUtils.getExtension(basePath);
            const uniqueName = `${basename}-${counter}${extension}`;
            testPath = dir ? PathUtils.join(dir, uniqueName) : uniqueName;
        }

        return testPath;
    }

    /**
     * Check if a file exists
     */
    private fileExists(filePath: string): boolean {
        const file = this.app.vault.getAbstractFileByPath(filePath);
        return file !== null;
    }

    static isAudioFile(fileInfo: FileInfo): boolean {
        const audioExtensions = ['.mp3', '.wav', '.m4a', '.mp4', '.webm', '.ogg'];
        return audioExtensions.includes(fileInfo.extension.toLowerCase());
    }
}