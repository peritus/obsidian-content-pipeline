/**
 * Chat Step Execution Logic
 */

import { App } from 'obsidian';
import { YamlProcessor } from '../../yaml-processor';
import { ChatClient } from '../../../api/chat-client';
import { FileOperations, FileUtils } from '../../file-operations';
import { PathUtils } from '../../path-resolver';
import { ArchiveHandler } from './ArchiveHandler';
import { OutputHandler } from './OutputHandler';
import { 
    PipelineStep,
    FileInfo, 
    ProcessingResult, 
    ProcessingStatus,
    ProcessingContext
} from '../../../types';
import { ErrorFactory } from '../../../error-handler';
import { createLogger } from '../../../logger';

const logger = createLogger('ChatStepExecutor');

export class ChatStepExecutor {
    private app: App;
    private yamlProcessor: YamlProcessor;
    private fileOps: FileOperations;
    private archiveHandler: ArchiveHandler;
    private outputHandler: OutputHandler;

    constructor(app: App) {
        this.app = app;
        this.yamlProcessor = new YamlProcessor(app);
        this.fileOps = new FileOperations(app);
        this.archiveHandler = new ArchiveHandler(app);
        this.outputHandler = new OutputHandler(app);
    }

    async execute(
        stepId: string,
        fileInfo: FileInfo,
        step: PipelineStep
    ): Promise<ProcessingResult> {
        const startTime = new Date();

        try {
            // Validate input parameters
            this.validateInput(stepId, fileInfo, step);

            logger.info(`Starting chat processing: ${fileInfo.name} with ${step.model}`);

            // Create processing context
            const context: ProcessingContext = {
                filename: PathUtils.getBasename(fileInfo.path),
                timestamp: FileUtils.generateTimestamp(),
                date: new Date().toISOString().split('T')[0],
                archivePath: '', // Will be set after archiving
                stepId,
                inputPath: fileInfo.path,
                outputPath: '' // Will be resolved per output file
            };

            // Format YAML request with next step routing
            const yamlRequest = await this.yamlProcessor.formatRequest(
                fileInfo,
                step.include || [],
                context,
                step.next // Pass next steps for routing
            );

            // Create chat client and process request
            const chatClient = new ChatClient({
                apiKey: step.apiKey,
                baseUrl: step.baseUrl,
                organization: step.organization
            });

            const parsedResponse = await chatClient.processYamlRequest(yamlRequest, {
                model: step.model,
                temperature: 0.1
            });

            // Archive input file first
            const archivePath = await this.archiveHandler.archive(fileInfo, step, stepId);
            context.archivePath = archivePath;

            // Save output files with direct content output
            const outputFiles: string[] = [];
            let nextStep: string | undefined;

            // Handle multi-file vs single-file responses
            if (parsedResponse.isMultiFile) {
                const savedFiles = await this.outputHandler.saveMultiple(parsedResponse.sections, step, context);
                outputFiles.push(...Object.values(savedFiles));
                
                // Get nextStep from first section that has it
                nextStep = parsedResponse.sections.find(section => section.nextStep)?.nextStep;
            } else if (parsedResponse.sections.length > 0) {
                const outputPath = await this.outputHandler.save(parsedResponse.sections[0], step, context);
                outputFiles.push(outputPath);
                nextStep = parsedResponse.sections[0].nextStep;
            }

            // Validate nextStep if present
            if (nextStep) {
                if (!step.next || !step.next[nextStep]) {
                    logger.warn(`Invalid nextStep '${nextStep}' not found in step configuration. Ending processing chain.`);
                    nextStep = undefined;
                }
            }

            logger.info(`Chat processing completed: ${fileInfo.name} → ${outputFiles.length} files`);

            return {
                inputFile: fileInfo,
                status: ProcessingStatus.COMPLETED,
                outputFiles,
                archivePath,
                startTime,
                endTime: new Date(),
                stepId,
                nextStep
            };

        } catch (error) {
            logger.error(`Chat processing failed: ${fileInfo?.name || 'unknown file'}`, error);
            throw error;
        }
    }

    /**
     * Validate input parameters for chat execution
     */
    private validateInput(stepId: string, fileInfo: FileInfo, step: PipelineStep): void {
        // Validate stepId
        if (!stepId || typeof stepId !== 'string') {
            throw ErrorFactory.validation(
                'Invalid stepId provided to ChatStepExecutor',
                'Step ID must be a non-empty string',
                { stepId },
                ['Provide a valid step ID string']
            );
        }

        // Validate step configuration
        if (!step) {
            throw ErrorFactory.validation(
                'No step configuration provided to ChatStepExecutor',
                'Pipeline step configuration is required',
                { stepId },
                ['Ensure step configuration is properly defined in pipeline']
            );
        }

        // Validate fileInfo
        if (!fileInfo) {
            throw ErrorFactory.validation(
                'No fileInfo provided to ChatStepExecutor',
                'File information is required for processing',
                { stepId },
                ['Ensure file discovery is working correctly', 'Check file exists and is accessible']
            );
        }

        // Validate fileInfo properties
        if (!fileInfo.path || typeof fileInfo.path !== 'string') {
            throw ErrorFactory.validation(
                'Invalid or missing file path in FileInfo',
                'File path is required and must be a valid string',
                { stepId, fileInfo: { ...fileInfo, path: fileInfo?.path } },
                [
                    'Check file discovery process', 
                    'Ensure FileInfo objects are created correctly',
                    'Verify file exists in vault'
                ]
            );
        }

        if (!fileInfo.name || typeof fileInfo.name !== 'string') {
            throw ErrorFactory.validation(
                'Invalid or missing file name in FileInfo',
                'File name is required and must be a valid string',
                { stepId, fileInfo },
                ['Check FileInfo creation process']
            );
        }

        // Log validation success
        logger.debug('Input validation passed', { 
            stepId, 
            fileName: fileInfo.name, 
            filePath: fileInfo.path 
        });
    }
}