/**
 * Individual Step Execution Logic
 */

import { App } from 'obsidian';
import { WhisperStepProcessor } from '../whisper-step';
import { ChatStepExecutor } from './ChatStepExecutor';
import { resolveStepFromSettings } from '../../../validation';
import { 
    ContentPipelineSettings,
    FileInfo, 
    ProcessingResult, 
    ProcessingStatus,
    ResolvedPipelineStep
} from '../../../types';
import { ContentPipelineError } from '../../../errors';
import { createLogger } from '../../../logger';

const logger = createLogger('StepExecutor');

export class StepExecutor {
    private app: App;
    private settings: ContentPipelineSettings;
    private whisperProcessor: WhisperStepProcessor;
    private chatExecutor: ChatStepExecutor;

    constructor(app: App, settings: ContentPipelineSettings) {
        this.app = app;
        this.settings = settings;
        this.whisperProcessor = new WhisperStepProcessor(app);
        this.chatExecutor = new ChatStepExecutor(app, settings);
    }

    async execute(
        stepId: string, 
        fileInfo: FileInfo
    ): Promise<ProcessingResult> {
        const startTime = new Date();

        try {
            logger.info(`Executing step: ${stepId} for file: ${fileInfo.path}`);

            // Resolve step configuration using centralized configuration service
            const resolvedStep = this.resolveStep(stepId);

            // Validate API key exists
            if (!resolvedStep.modelConfig.apiKey || resolvedStep.modelConfig.apiKey.trim() === '') {
                throw new ContentPipelineError(`No API key configured for step "${stepId}"`);
            }

            // Route to appropriate processor based on model implementation
            const implementation = resolvedStep.modelConfig.implementation;
            
            if (implementation === 'whisper' && WhisperStepProcessor.isAudioFile(fileInfo)) {
                return await this.whisperProcessor.executeWhisperStep(stepId, fileInfo, resolvedStep);
            } else if (implementation === 'chatgpt') {
                return await this.chatExecutor.execute(stepId, fileInfo, resolvedStep);
            }

            // Unsupported implementation
            throw new ContentPipelineError(`Unsupported model implementation: ${implementation}`);

        } catch (error) {
            logger.error(`Step execution failed: ${stepId}`, error);
            
            // Return failed result instead of throwing
            return {
                inputFile: fileInfo,
                status: ProcessingStatus.FAILED,
                outputFiles: [],
                startTime,
                endTime: new Date(),
                stepId,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    /**
     * Resolve pipeline step using centralized validation function
     */
    private resolveStep(stepId: string): ResolvedPipelineStep {
        return resolveStepFromSettings(stepId, this.settings);
    }
}