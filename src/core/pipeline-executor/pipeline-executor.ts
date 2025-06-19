/**
 * Pipeline Execution Engine - Main Orchestrator (v1.2 - Updated for dual configuration)
 */

import { App } from 'obsidian';
import { ExecutionState } from './execution-state';
import { FileDiscovery } from '../file-operations';
import { StepChain } from './StepChain';
import { createConfigurationService } from '../configuration-service';
import { 
    AudioInboxSettings, 
    PipelineConfiguration, 
    FileInfo, 
    ProcessingResult, 
    ProcessingStatus
} from '../../types';
import { createLogger } from '../../logger';

const logger = createLogger('PipelineExecutor');

interface ExecutionOptions {
    continueOnError?: boolean;
    maxFiles?: number;
}

export class PipelineExecutor {
    private settings: AudioInboxSettings;
    private executionState: ExecutionState;
    private fileDiscovery: FileDiscovery;
    private stepChain: StepChain;

    constructor(app: App, settings: AudioInboxSettings) {
        this.settings = settings;
        this.executionState = new ExecutionState();
        this.fileDiscovery = new FileDiscovery(app);
        this.stepChain = new StepChain(app, settings);
        logger.debug('PipelineExecutor initialized with dual configuration support');
    }

    async processNextFile(options: ExecutionOptions = {}): Promise<ProcessingResult> {
        const { continueOnError = false } = options;

        if (this.executionState.isProcessing()) {
            throw new Error('Pipeline execution already in progress');
        }

        try {
            this.executionState.startProcessing();
            logger.info('Starting pipeline execution');

            const config = this.getPipelineConfiguration();
            const fileToProcess = await this.fileDiscovery.findNextAvailableFile(
                config, 
                this.executionState.getActiveFilesSet()
            );
            
            if (!fileToProcess) {
                return this.createResult(ProcessingStatus.SKIPPED, 'No files available');
            }

            logger.info(`Processing: ${fileToProcess.file.path} (${fileToProcess.stepId})`);
            
            this.executionState.addActiveFile(fileToProcess.file.path);
            
            // Execute step (StepChain now handles configuration resolution internally)
            const result = await this.stepChain.executeStep(
                fileToProcess.stepId, 
                fileToProcess.file
            );
            
            logger.info(`Completed: ${result.outputFiles.length} files generated`);
            return result;

        } catch (error) {
            logger.error('Pipeline execution failed:', error);
            
            if (continueOnError) {
                return this.createResult(ProcessingStatus.FAILED, String(error));
            }
            throw error;
        } finally {
            this.executionState.endProcessing();
        }
    }

    async executeStep(stepId: string, fileInfo: FileInfo): Promise<ProcessingResult> {
        // StepChain now handles configuration resolution internally
        return await this.stepChain.executeStep(stepId, fileInfo);
    }

    getExecutionStatus() {
        return this.executionState.getStatus();
    }

    private getPipelineConfiguration(): PipelineConfiguration {
        // Use centralized configuration service for validated configuration
        const configService = createConfigurationService(this.settings);
        return configService.getValidatedPipelineConfiguration();
    }

    private createResult(status: ProcessingStatus, error?: string): ProcessingResult {
        return {
            inputFile: {} as FileInfo,
            status,
            outputFiles: [],
            startTime: new Date(),
            endTime: new Date(),
            stepId: status === ProcessingStatus.SKIPPED ? 'none' : 'unknown',
            error
        };
    }
}