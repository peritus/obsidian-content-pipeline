/**
 * Step Chain Execution - Main Orchestrator
 */

import { App } from 'obsidian';
import { StepExecutor } from './StepExecutor';
import { ChainExecutor } from './ChainExecutor';
import { 
    AudioInboxSettings,
    PipelineConfiguration, 
    FileInfo, 
    ProcessingResult
} from '../../../types';
import { createLogger } from '../../../logger';

const logger = createLogger('StepChain');

export class StepChain {
    private stepExecutor: StepExecutor;
    private chainExecutor: ChainExecutor;

    constructor(app: App, settings: AudioInboxSettings) {
        this.stepExecutor = new StepExecutor(app, settings);
        this.chainExecutor = new ChainExecutor(app, this.stepExecutor);
        logger.debug('StepChain initialized with full API support');
    }

    async executeStep(
        stepId: string, 
        fileInfo: FileInfo, 
        config: PipelineConfiguration
    ): Promise<ProcessingResult> {
        return await this.stepExecutor.execute(stepId, fileInfo, config);
    }

    async executeChain(
        startStepId: string, 
        inputFile: FileInfo, 
        config: PipelineConfiguration
    ): Promise<ProcessingResult> {
        return await this.chainExecutor.execute(startStepId, inputFile, config);
    }
}
