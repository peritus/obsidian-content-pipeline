/**
 * Individual Step Execution Logic (v1.2 - Updated for dual configuration)
 */

import { App } from 'obsidian';
import { WhisperStepProcessor } from '../whisper-step';
import { ChatStepExecutor } from './ChatStepExecutor';
import { createConfigurationService } from '../../configuration-service';
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

            // Resolve step configuration using centralized configuration service
            const resolvedStep = this.resolveStep(stepId);

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
     * Resolve pipeline step using centralized configuration service
     */
    private resolveStep(stepId: string): ResolvedPipelineStep {
        const configService = createConfigurationService(this.settings);
        return configService.resolveStep(stepId);
    }
}