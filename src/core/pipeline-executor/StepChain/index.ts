/**
 * Step Chain Execution - Main Orchestrator (v1.2 - Updated for dual configuration)
 */

import { App } from 'obsidian';
import { StepExecutor } from './StepExecutor';
import { ChainExecutor } from './ChainExecutor';
import { 
    ContentPipelineSettings,
    FileInfo, 
    ProcessingResult
} from '../../../types';
import { createLogger } from '../../../logger';

const logger = createLogger('StepChain');

export class StepChain {
    private stepExecutor: StepExecutor;
    private chainExecutor: ChainExecutor;

    constructor(app: App, settings: ContentPipelineSettings) {
        this.stepExecutor = new StepExecutor(app, settings);
        this.chainExecutor = new ChainExecutor(app, this.stepExecutor);
        logger.debug('StepChain initialized with dual configuration support');
    }

    async executeStep(
        stepId: string, 
        fileInfo: FileInfo
    ): Promise<ProcessingResult> {
        return await this.stepExecutor.execute(stepId, fileInfo);
    }

    async executeChain(
        startStepId: string, 
        inputFile: FileInfo
    ): Promise<ProcessingResult> {
        return await this.chainExecutor.execute(startStepId, inputFile);
    }
}