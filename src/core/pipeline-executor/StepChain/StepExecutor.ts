/**
 * Individual Step Execution Logic (v1.2 - Updated for dual configuration)
 */

import { App } from 'obsidian';
import { WhisperStepProcessor } from '../whisper-step';
import { ChatStepExecutor } from './ChatStepExecutor';
import { createConfigurationResolver } from '../../../validation/configuration-resolver';
import { 
    AudioInboxSettings,
    FileInfo, 
    ProcessingResult, 
    ProcessingStatus,
    ResolvedPipelineStep
} from '../../../types';
import { ErrorFactory } from '../../../error-handler';
import { createLogger } from '../../../logger';

const logger = createLogger('StepExecutor');

export class StepExecutor {
    private app: App;
    private settings: AudioInboxSettings;
    private whisperProcessor: WhisperStepProcessor;
    private chatExecutor: ChatStepExecutor;

    constructor(app: App, settings: AudioInboxSettings) {
        this.app = app;
        this.settings = settings;
        this.whisperProcessor = new WhisperStepProcessor(app);
        this.chatExecutor = new ChatStepExecutor(app);
    }

    async execute(
        stepId: string, 
        fileInfo: FileInfo
    ): Promise<ProcessingResult> {
        const startTime = new Date();

        try {
            logger.info(`Executing step: ${stepId} for file: ${fileInfo.path}`);

            // Resolve step configuration using ConfigurationResolver
            const resolvedStep = await this.resolveStep(stepId);

            // Validate API key exists
            if (!resolvedStep.modelConfig.apiKey || resolvedStep.modelConfig.apiKey.trim() === '') {
                throw ErrorFactory.configuration(
                    'No API key configured for step',
                    `Step "${stepId}" requires an API key in model configuration "${resolvedStep.modelConfig.model}"`,
                    { stepId, modelConfigId: resolvedStep.stepId, model: resolvedStep.modelConfig.model },
                    ['Configure API key in models configuration', 'Add valid API key for the model']
                );
            }

            // Route to appropriate processor based on model implementation
            const implementation = resolvedStep.modelConfig.implementation;
            
            if (implementation === 'whisper' && WhisperStepProcessor.isAudioFile(fileInfo)) {
                return await this.whisperProcessor.executeWhisperStep(stepId, fileInfo, resolvedStep);
            } else if (implementation === 'chatgpt' || implementation === 'claude') {
                return await this.chatExecutor.execute(stepId, fileInfo, resolvedStep);
            }

            // Unsupported implementation
            throw ErrorFactory.pipeline(
                `Unsupported model implementation: ${implementation}`,
                `Model implementation "${implementation}" is not supported`,
                { stepId, implementation, model: resolvedStep.modelConfig.model },
                ['Use "whisper" for audio transcription', 'Use "chatgpt" or "claude" for text processing']
            );

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
     * Resolve pipeline step using ConfigurationResolver
     */
    private async resolveStep(stepId: string): Promise<ResolvedPipelineStep> {
        // Validate settings are available
        if (!this.settings.modelsConfig || !this.settings.pipelineConfig) {
            throw ErrorFactory.configuration(
                'Configuration not available',
                'Both models and pipeline configurations are required',
                { stepId },
                ['Configure models and pipeline in settings', 'Ensure configurations are saved']
            );
        }

        try {
            // Create resolver and resolve step
            const resolver = createConfigurationResolver(
                this.settings.modelsConfig,
                this.settings.pipelineConfig
            );

            return resolver.resolveStep(stepId);

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw ErrorFactory.configuration(
                `Failed to resolve step configuration: ${errorMessage}`,
                `Cannot resolve step "${stepId}" configuration`,
                { stepId, error: errorMessage },
                ['Check step exists in pipeline configuration', 'Verify model config reference is valid', 'Validate configuration syntax']
            );
        }
    }
}