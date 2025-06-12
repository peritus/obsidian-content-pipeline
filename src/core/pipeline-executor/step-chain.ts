/**
 * Step Chain Execution
 */

import { App } from 'obsidian';
import { PathUtils } from '../path-resolver';
import { 
    AudioInboxSettings,
    PipelineConfiguration, 
    FileInfo, 
    ProcessingResult, 
    ProcessingStatus,
    PathContext
} from '../../types';
import { ErrorFactory } from '../../error-handler';
import { createLogger } from '../../logger';

const logger = createLogger('StepChain');

export class StepChain {
    private app: App;
    private settings: AudioInboxSettings;

    constructor(app: App, settings: AudioInboxSettings) {
        this.app = app;
        this.settings = settings;
        logger.debug('StepChain initialized');
    }

    async executeChain(
        startStepId: string,
        inputFile: FileInfo,
        config: PipelineConfiguration
    ): Promise<ProcessingResult> {
        let currentStepId = startStepId;
        let currentFiles = [inputFile];
        const allOutputFiles: string[] = [];
        const startTime = new Date();

        while (currentStepId && currentFiles.length > 0) {
            const step = config[currentStepId];
            if (!step) {
                throw ErrorFactory.pipeline(
                    `Step not found in chain: ${currentStepId}`,
                    `Cannot continue pipeline chain`,
                    { stepId: currentStepId, availableSteps: Object.keys(config) }
                );
            }

            logger.debug(`Executing step: ${currentStepId} with ${currentFiles.length} files`);

            const stepResults = await Promise.all(
                currentFiles.map(file => this.executeStep(currentStepId, file, config))
            );

            stepResults.forEach(result => {
                allOutputFiles.push(...result.outputFiles);
            });

            currentStepId = step.next || '';
            
            if (currentStepId) {
                // TODO: Convert output files to FileInfo for next step
                currentFiles = [];
                logger.debug(`Prepared for next step: ${currentStepId}`);
            }
        }

        return {
            inputFile,
            status: ProcessingStatus.COMPLETED,
            outputFiles: allOutputFiles,
            startTime,
            endTime: new Date(),
            stepId: startStepId
        };
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
                { stepId, availableSteps: Object.keys(config) },
                ['Check step ID spelling', 'Verify pipeline configuration']
            );
        }

        const startTime = new Date();

        try {
            logger.info(`Executing step: ${stepId} for file: ${fileInfo.path}`);

            const context = this.createProcessingContext(fileInfo, stepId);
            
            // TODO: Implement actual step execution with:
            // - YAML frontmatter formatting
            // - API calls (Whisper/ChatGPT)
            // - Template processing
            // - File generation and archiving
            
            const result: ProcessingResult = {
                inputFile: fileInfo,
                status: ProcessingStatus.PENDING,
                outputFiles: [],
                startTime,
                stepId,
                nextStep: step.next
            };

            logger.debug(`Step ${stepId} prepared`, { context });
            return result;

        } catch (error) {
            logger.error(`Step execution failed: ${stepId}`, error);
            throw ErrorFactory.pipeline(
                `Step execution failed: ${error instanceof Error ? error.message : String(error)}`,
                `Failed to execute step "${stepId}"`,
                { stepId, fileInfo, originalError: error },
                ['Check step configuration', 'Verify file accessibility']
            );
        }
    }

    private createProcessingContext(fileInfo: FileInfo, stepId: string): PathContext {
        return {
            category: fileInfo.category,
            filename: PathUtils.getBasename(fileInfo.path),
            stepId,
            timestamp: new Date().toISOString(),
            date: new Date().toISOString().split('T')[0]
        };
    }
}