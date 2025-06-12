/**
 * Individual Step Execution Logic
 */

import { App } from 'obsidian';
import { WhisperStepProcessor } from '../whisper-step';
import { ChatStepExecutor } from './ChatStepExecutor';
import { 
    AudioInboxSettings,
    PipelineConfiguration, 
    PipelineStep,
    FileInfo, 
    ProcessingResult, 
    ProcessingStatus
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
        fileInfo: FileInfo, 
        config: PipelineConfiguration
    ): Promise<ProcessingResult> {
        const step = config[stepId];
        
        if (!step) {
            throw ErrorFactory.pipeline(
                `Step not found: ${stepId}`,
                `Pipeline step "${stepId}" is not configured`,
                { stepId }
            );
        }

        const startTime = new Date();

        try {
            logger.info(`Executing step: ${stepId} for file: ${fileInfo.path}`);

            // Check API key
            if (!step.apiKey || step.apiKey.trim() === '') {
                throw ErrorFactory.configuration(
                    'No API key configured for step',
                    `Step "${stepId}" requires an API key`,
                    { stepId, model: step.model },
                    ['Configure API key in pipeline settings', 'Add valid OpenAI API key']
                );
            }

            // Route to appropriate processor based on model
            if (step.model === 'whisper-1' && WhisperStepProcessor.isAudioFile(fileInfo)) {
                return await this.whisperProcessor.executeWhisperStep(stepId, fileInfo, step);
            } else if (this.isChatModel(step.model)) {
                return await this.chatExecutor.execute(stepId, fileInfo, step);
            }

            // Unsupported model
            throw ErrorFactory.pipeline(
                `Unsupported model: ${step.model}`,
                `Model "${step.model}" is not supported`,
                { stepId, model: step.model },
                ['Use whisper-1 for audio transcription', 'Use gpt-4, gpt-3.5-turbo, or other chat models for text processing']
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

    private isChatModel(model: string): boolean {
        const chatModels = ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo', 'gpt-4o'];
        return chatModels.some(chatModel => model.startsWith(chatModel));
    }
}
