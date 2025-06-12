/**
 * Step Chain Execution
 */

import { App } from 'obsidian';
import { PathUtils } from '../path-resolver';
import { YamlProcessor } from '../yaml-processor';
import { 
    AudioInboxSettings,
    PipelineConfiguration, 
    FileInfo, 
    ProcessingResult, 
    ProcessingStatus,
    ProcessingContext
} from '../../types';
import { ErrorFactory } from '../../error-handler';
import { createLogger } from '../../logger';

const logger = createLogger('StepChain');

export class StepChain {
    private app: App;
    private settings: AudioInboxSettings;
    private yamlProcessor: YamlProcessor;

    constructor(app: App, settings: AudioInboxSettings) {
        this.app = app;
        this.settings = settings;
        this.yamlProcessor = new YamlProcessor(app);
        logger.debug('StepChain initialized with YAML processor');
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

            const context = this.createProcessingContext(fileInfo, stepId, step);
            
            // Format YAML request for LLM
            const yamlRequest = await this.yamlProcessor.formatRequest(
                fileInfo,
                step.include,
                context,
                { includeCategory: true, strictValidation: false }
            );

            logger.debug(`YAML request formatted for ${stepId}:`, {
                requestLength: yamlRequest.length,
                includeFiles: step.include.length,
                category: context.resolvedCategory
            });

            // TODO: Implement actual API calls with formatted request:
            // - Send yamlRequest to appropriate API (Whisper/ChatGPT)
            // - Parse response using yamlProcessor.parseResponse()
            // - Apply template processing
            // - Generate output files and archive input
            
            const result: ProcessingResult = {
                inputFile: fileInfo,
                status: ProcessingStatus.PENDING,
                outputFiles: [],
                startTime,
                stepId,
                nextStep: step.next
            };

            logger.debug(`Step ${stepId} YAML formatted, ready for API call`);
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

    private createProcessingContext(fileInfo: FileInfo, stepId: string, step: any): ProcessingContext {
        const basename = PathUtils.getBasename(fileInfo.path);
        const timestamp = new Date().toISOString();
        const date = timestamp.split('T')[0];

        // TODO: Resolve actual output path using step.output pattern
        const outputPath = `${step.output}/${basename}-output.md`;
        
        // TODO: Resolve actual archive path using step.archive pattern  
        const archivePath = `${step.archive}/${fileInfo.name}`;

        return {
            originalCategory: fileInfo.category,
            resolvedCategory: fileInfo.category, // No routing yet
            filename: basename,
            timestamp,
            date,
            archivePath,
            stepId,
            inputPath: fileInfo.path,
            outputPath
        };
    }
}