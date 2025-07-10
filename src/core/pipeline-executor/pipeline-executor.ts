/**
 * Pipeline Execution Engine - Main Orchestrator
 */

import { App } from 'obsidian';
import { ExecutionState } from './execution-state';
import { FileDiscovery } from '../file-operations';
import { StepChain } from './StepChain';
import { getValidatedPipelineConfiguration } from '../../validation';
import {
    ContentPipelineSettings,
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

interface BatchProcessingOptions {
    maxIterations?: number;
    continueOnError?: boolean;
}

export class PipelineExecutor {
    private settings: ContentPipelineSettings;
    private executionState: ExecutionState;
    private fileDiscovery: FileDiscovery;
    private stepChain: StepChain;

    constructor(app: App, settings: ContentPipelineSettings) {
        this.settings = settings;
        this.executionState = new ExecutionState();
        this.fileDiscovery = new FileDiscovery(app);
        this.stepChain = new StepChain(app, settings);
        logger.debug('PipelineExecutor initialized with dual configuration support');
    }

    /**
     * Process the next available file - elegant wrapper around batch iterator
     * 
     * This is now just the degenerate case of batch processing with maxIterations: 1
     */
    async processNextFile(options: ExecutionOptions = {}): Promise<ProcessingResult> {
        const { continueOnError = false } = options;

        logger.info('Starting single file processing');

        // Single file processing is just batch processing with limit 1
        for await (const result of this.processAllFilesIterator({ 
            maxIterations: 1, 
            continueOnError 
        })) {
            logger.info(`Single file processing completed: ${result.inputFile.name} → ${result.status}`);
            return result;
        }

        // No files available for processing
        const skippedResult = this.createResult(ProcessingStatus.SKIPPED, 'No files available');
        logger.info('Single file processing completed: No files available');
        return skippedResult;
    }

    /**
     * Elegant iterator for batch processing with encapsulated state management
     * 
     * This method returns an async generator that yields processing results
     * while maintaining its own state, eliminating the need for external
     * loop management and safety mechanisms.
     */
    async* processAllFilesIterator(options: BatchProcessingOptions = {}): AsyncGenerator<ProcessingResult, void, unknown> {
        const {
            maxIterations = 100,
            continueOnError = true
        } = options;

        logger.info('Starting batch processing iterator');
        
        const processedFiles = new Set<string>();
        let currentIteration = 0;

        try {
            while (currentIteration < maxIterations) {
                currentIteration++;
                
                // Find next available file using persistent exclude set
                const config = this.getPipelineConfiguration();
                const fileToProcess = await this.fileDiscovery.findNextAvailableFile(
                    config,
                    processedFiles
                );

                if (!fileToProcess) {
                    logger.info('No more files available for batch processing');
                    break;
                }

                // Track the file we're about to process
                processedFiles.add(fileToProcess.file.path);

                try {
                    // Execute the step directly
                    const result = await this.stepChain.executeStep(
                        fileToProcess.stepId,
                        fileToProcess.file
                    );

                    logger.info(`Batch processing iteration ${currentIteration}: ${fileToProcess.file.name} → ${result.status}`);
                    yield result;

                } catch (error) {
                    const errorResult: ProcessingResult = {
                        inputFile: this.createFileInfo(fileToProcess.file),
                        status: ProcessingStatus.FAILED,
                        outputFiles: [],
                        startTime: new Date(),
                        endTime: new Date(),
                        stepId: fileToProcess.stepId,
                        error: error instanceof Error ? error.message : String(error)
                    };

                    logger.warn(`Batch processing iteration ${currentIteration} failed: ${error}`);
                    
                    if (continueOnError) {
                        yield errorResult;
                    } else {
                        throw error;
                    }
                }
            }

            if (currentIteration >= maxIterations) {
                logger.warn(`Batch processing stopped: reached maximum iterations (${maxIterations})`);
            }

        } finally {
            logger.info(`Batch processing iterator completed: ${currentIteration} iterations, ${processedFiles.size} unique files`);
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
        // Use centralized validation function for validated configuration
        return getValidatedPipelineConfiguration(this.settings);
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

    private createFileInfo(file: { name: string; path: string; size?: number }): FileInfo {
        return {
            name: file.name,
            path: file.path,
            size: file.size || 0,
            extension: file.name.includes('.') ? '.' + file.name.split('.').pop() : '',
            isProcessable: true,
            lastModified: new Date(),
            mimeType: undefined
        };
    }
}
