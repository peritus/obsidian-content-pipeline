/**
 * Pipeline Execution Engine - Main Orchestrator (v1.2 - Updated for dual configuration)
 */

import { App } from 'obsidian';
import { ExecutionState } from './execution-state';
import { FileDiscovery } from '../file-operations';
import { StepChain } from './StepChain';
import { createConfigurationResolver } from '../../validation/configuration-resolver';
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
        logger.debug('PipelineExecutor initialized with dual configuration support');
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
        // Validate that dual configuration is available
        if (!this.settings.modelsConfig || !this.settings.pipelineConfig) {
            throw ErrorFactory.configuration(
                'Dual configuration not available',
                'Both models and pipeline configurations are required',
                { hasModels: !!this.settings.modelsConfig, hasPipeline: !!this.settings.pipelineConfig },
                ['Configure both models and pipeline in settings', 'Ensure configurations are saved']
            );
        }

        // Use ConfigurationResolver to validate configuration is resolvable
        try {
            const resolver = createConfigurationResolver(
                this.settings.modelsConfig,
                this.settings.pipelineConfig
            );
            
            const validationResult = resolver.validate();
            if (!validationResult.isValid) {
                const errorSummary = [
                    ...validationResult.modelsErrors,
                    ...validationResult.pipelineErrors,
                    ...validationResult.crossRefErrors
                ].join('; ');
                
                throw ErrorFactory.configuration(
                    `Configuration validation failed: ${errorSummary}`,
                    'Pipeline configuration contains validation errors',
                    { validationResult },
                    ['Fix configuration errors in settings', 'Validate configuration before processing']
                );
            }

            // Return parsed pipeline configuration (FileDiscovery still expects this format)
            if (!this.settings.parsedPipelineConfig) {
                throw ErrorFactory.configuration(
                    'Parsed pipeline configuration not available',
                    'Pipeline configuration is not parsed',
                    {},
                    ['Reload plugin', 'Re-save configuration in settings']
                );
            }

            return this.settings.parsedPipelineConfig;

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw ErrorFactory.configuration(
                `Failed to validate configuration: ${errorMessage}`,
                'Cannot validate dual configuration for pipeline execution',
                { error: errorMessage },
                ['Check configuration syntax', 'Verify model config references', 'Reload plugin']
            );
        }
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