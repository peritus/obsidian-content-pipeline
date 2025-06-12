/**
 * Step Chain Execution with API Integration
 */

import { App } from 'obsidian';
import { WhisperStepProcessor } from './whisper-step';
import { 
    AudioInboxSettings,
    PipelineConfiguration, 
    FileInfo, 
    ProcessingResult, 
    ProcessingStatus
} from '../../types';
import { ErrorFactory } from '../../error-handler';
import { createLogger } from '../../logger';

const logger = createLogger('StepChain');

export class StepChain {
    private app: App;
    private settings: AudioInboxSettings;
    private whisperProcessor: WhisperStepProcessor;

    constructor(app: App, settings: AudioInboxSettings) {
        this.app = app;
        this.settings = settings;
        this.whisperProcessor = new WhisperStepProcessor(app);
        logger.debug('StepChain initialized');
    }

    async executeStep(
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
            }

            // For non-Whisper steps, return pending status for now
            logger.info(`Step ${stepId} not yet implemented for model: ${step.model}`);
            return {
                inputFile: fileInfo,
                status: ProcessingStatus.PENDING,
                outputFiles: [],
                startTime,
                endTime: new Date(),
                stepId,
                nextStep: step.next,
                error: `Model ${step.model} not yet implemented`
            };

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

    async executeChain(
        startStepId: string, 
        inputFile: FileInfo, 
        config: PipelineConfiguration
    ): Promise<ProcessingResult> {
        let currentStepId = startStepId;
        let lastResult: ProcessingResult;

        try {
            // Execute first step
            lastResult = await this.executeStep(currentStepId, inputFile, config);
            
            // For now, just execute the first step
            // TODO: Implement full chain execution when we have multiple step types
            
            return lastResult;

        } catch (error) {
            logger.error('Chain execution failed:', error);
            throw error;
        }
    }
}