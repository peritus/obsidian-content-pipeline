/**
 * Chain Execution Logic
 */

import { App } from 'obsidian';
import { FileOperations } from '../../file-operations';
import { StepExecutor } from './StepExecutor';
import {
    FileInfo,
    ProcessingResult,
    ProcessingStatus
} from '../../../types';
import { createLogger } from '../../../logger';

const logger = createLogger('ChainExecutor');

export class ChainExecutor {
    private app: App;
    private fileOps: FileOperations;
    private stepExecutor: StepExecutor;

    constructor(app: App, stepExecutor: StepExecutor) {
        this.app = app;
        this.fileOps = new FileOperations(app);
        this.stepExecutor = stepExecutor;
    }

    async execute(
        startStepId: string,
        inputFile: FileInfo
    ): Promise<ProcessingResult> {
        let currentStepId = startStepId;
        let currentFile = inputFile;
        const allResults: ProcessingResult[] = [];

        try {
            logger.info(`Starting chain execution: ${startStepId} for ${inputFile.path}`);

            while (currentStepId) {
                // Execute current step (StepExecutor handles configuration resolution internally)
                const result = await this.stepExecutor.execute(currentStepId, currentFile);
                allResults.push(result);

                // Check if step failed
                if (result.status === ProcessingStatus.FAILED) {
                    logger.error(`Chain execution stopped due to failed step: ${currentStepId}`);
                    return result;
                }

                // Check if there's a next step
                if (!result.nextStep || result.outputFiles.length === 0) {
                    logger.info(`Chain execution complete at step: ${currentStepId}`);
                    return result;
                }

                // Prepare for next step - use first output file as input for next step
                const outputFilePath = result.outputFiles[0];
                try {
                    const outputFile = this.app.vault.getAbstractFileByPath(outputFilePath);
                    if (!outputFile) {
                        throw new Error(`Output file not found: ${outputFilePath}`);
                    }
                    currentFile = this.fileOps.getFileInfo(outputFile as any);
                    currentStepId = result.nextStep;
                    logger.debug(`Chaining to next step: ${currentStepId} with file: ${outputFilePath}`);
                } catch (error) {
                    logger.error(`Failed to prepare next step input: ${outputFilePath}`, error);
                    return {
                        ...result,
                        status: ProcessingStatus.FAILED,
                        error: `Failed to chain to next step: ${error instanceof Error ? error.message : String(error)}`
                    };
                }
            }

            // This should never be reached, but return the last result as fallback
            return allResults[allResults.length - 1];

        } catch (error) {
            logger.error('Chain execution failed:', error);
            throw error;
        }
    }
}
