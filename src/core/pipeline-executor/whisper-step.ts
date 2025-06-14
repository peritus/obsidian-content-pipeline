/**
 * Whisper-specific step processing (v1.2 - Updated for dual configuration)
 */

import { App } from 'obsidian';
import { PathUtils } from '../path-resolver';
import { FileOperations } from '../file-operations';
import { WhisperClient } from '../../api';
import { FileInfo, ProcessingResult, ProcessingStatus, ResolvedPipelineStep } from '../../types';
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

            // Format and save output using archive path for source metadata
            const outputContent = this.formatTranscriptionOutput(transcriptionResult.text, fileInfo, stepId, archivePath);
            const outputPath = this.resolveOutputPath(resolvedStep.output, fileInfo);
            
            await this.fileOps.writeFile(outputPath, outputContent, {
                createDirectories: true,
                overwrite: true
            });

            logger.info(`Whisper transcription completed: ${fileInfo.name} → ${outputPath}`);

            // Get next step from resolved step configuration
            let nextStep: string | undefined;
            if (resolvedStep.next) {
                // For Whisper steps, we might have intelligent routing
                // For now, just take the first available next step
                const nextStepIds = Object.keys(resolvedStep.next);
                if (nextStepIds.length > 0) {
                    nextStep = nextStepIds[0]; // Simple fallback - could be enhanced with content analysis
                }
            }

            return {
                inputFile: fileInfo,
                status: ProcessingStatus.COMPLETED,
                outputFiles: [outputPath],
                archivePath,
                startTime,
                endTime: new Date(),
                stepId,
                nextStep
            };

        } catch (error) {
            logger.error(`Whisper transcription failed: ${fileInfo.name}`, error);
            throw error;
        }
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

    private formatTranscriptionOutput(text: string, fileInfo: FileInfo, stepId: string, archivePath: string): string {
        const timestamp = new Date().toISOString();
        
        return `---
source: [[${archivePath}]]
processed: "${timestamp}"
step: "${stepId}"
pipeline: "audio-processing"
---

# Transcript: ${PathUtils.getBasename(fileInfo.path)}

**Original Audio:** [[${archivePath}]]
**Processed:** ${timestamp}

---

${text}`;
    }

    private resolveOutputPath(outputPattern: string, fileInfo: FileInfo): string {
        const basename = PathUtils.getBasename(fileInfo.path);
        return outputPattern
            .replace('{filename}', basename)
            .replace('{date}', new Date().toISOString().split('T')[0])
            .replace('{timestamp}', new Date().toISOString());
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