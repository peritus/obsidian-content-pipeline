/**
 * Pipeline Execution Engine - Main Orchestrator
 */

import { App } from 'obsidian';
import { ExecutionState } from './execution-state';
import { FileDiscovery } from './file-discovery';
import { StepChain } from './step-chain';
import { 
    AudioInboxSettings, 
    PipelineConfiguration, 
    FileInfo, 
    ProcessingResult, 
    ProcessingStatus
} from '../../types';
import { ErrorFactory } from '../../error-handler';
import { createLogger } from '../../logger';

const logger = createLogger('PipelineExecutor');

export interface ExecutionOptions {
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
        logger.debug('PipelineExecutor initialized');
    }

    async processNextFile(options: ExecutionOptions = {}): Promise<ProcessingResult> {
        const { continueOnError = false } = options;

        if (this.executionState.isProcessing()) {
            throw ErrorFactory.pipeline(
                'Pipeline execution already in progress',
                'Another file is currently being processed',
                { activeFiles: this.executionState.getActiveFiles() },
                ['Wait for current processing to complete']
            );
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
            const result = await this.stepChain.executeChain(
                fileToProcess.stepId, 
                fileToProcess.file, 
                config
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
        const config = this.getPipelineConfiguration();
        return await this.stepChain.executeStep(stepId, fileInfo, config);
    }

    getExecutionStatus() {
        return this.executionState.getStatus();
    }

    private getPipelineConfiguration(): PipelineConfiguration {
        if (!this.settings.parsedPipelineConfig) {
            throw ErrorFactory.configuration(
                'No pipeline configuration available',
                'Pipeline configuration is not loaded',
                {},
                ['Configure pipeline in settings', 'Reload plugin']
            );
        }
        return this.settings.parsedPipelineConfig;
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