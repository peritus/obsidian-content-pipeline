/**
 * Whisper-specific step processing
 */

import { App } from 'obsidian';
import { PathUtils } from '../path-resolver';
import { FileOperations } from '../file-operations';
import { WhisperClient } from '../../api';
import { FileInfo, ProcessingResult, ProcessingStatus } from '../../types';
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
        step: any
    ): Promise<ProcessingResult> {
        const startTime = new Date();

        try {
            logger.info(`Starting Whisper transcription: ${fileInfo.name}`);

            // Read audio file
            const audioBuffer = await this.readAudioFile(fileInfo.path);
            
            // Create Whisper client and transcribe
            const whisperClient = new WhisperClient({
                apiKey: step.apiKey,
                baseUrl: step.baseUrl,
                organization: step.organization
            });

            const transcriptionResult = await whisperClient.transcribeAudio(
                audioBuffer,
                fileInfo.name,
                { responseFormat: 'text' }
            );

            // Format and save output
            const outputContent = this.formatTranscriptionOutput(transcriptionResult.text, fileInfo, stepId);
            const outputPath = this.resolveOutputPath(step.output, fileInfo);
            
            await this.fileOps.writeFile(outputPath, outputContent, {
                createDirectories: true,
                overwrite: true
            });

            // Archive original file
            await this.archiveFile(fileInfo.path, step.archive, fileInfo);

            logger.info(`Whisper transcription completed: ${fileInfo.name} → ${outputPath}`);

            // Get next step from step configuration
            let nextStep: string | undefined;
            if (step.next) {
                // For Whisper steps, we might have intelligent routing
                // For now, just take the first available next step
                const nextStepIds = Object.keys(step.next);
                if (nextStepIds.length > 0) {
                    nextStep = nextStepIds[0]; // Simple fallback
                }
            }

            return {
                inputFile: fileInfo,
                status: ProcessingStatus.COMPLETED,
                outputFiles: [outputPath],
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

    private formatTranscriptionOutput(text: string, fileInfo: FileInfo, stepId: string): string {
        const timestamp = new Date().toISOString();
        
        return `---
source: "${fileInfo.path}"
processed: "${timestamp}"
step: "${stepId}"
pipeline: "audio-processing"
---

# Transcript: ${PathUtils.getBasename(fileInfo.path)}

**Original Audio:** [[${fileInfo.path}]]
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

    private async archiveFile(sourcePath: string, archivePattern: string, fileInfo: FileInfo): Promise<void> {
        try {
            // Archive pattern should be step-based: inbox/archive/{stepId}
            const archivePath = archivePattern + '/' + fileInfo.name;
            
            // Ensure archive directory exists
            const archiveDir = PathUtils.getDirectory(archivePath);
            if (archiveDir) {
                await this.fileOps.ensureDirectory(archiveDir);
            }

            // Move file to archive
            const sourceFile = this.app.vault.getAbstractFileByPath(sourcePath);
            if (sourceFile) {
                await this.app.vault.rename(sourceFile, archivePath);
                logger.debug(`File archived: ${sourcePath} → ${archivePath}`);
            }

        } catch (error) {
            logger.warn(`Failed to archive file: ${sourcePath}`, error);
        }
    }

    static isAudioFile(fileInfo: FileInfo): boolean {
        const audioExtensions = ['.mp3', '.wav', '.m4a', '.mp4', '.webm', '.ogg'];
        return audioExtensions.includes(fileInfo.extension.toLowerCase());
    }
}