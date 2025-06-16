/**
 * Chat Step Execution Logic (v1.2 - Updated for dual configuration)
 */

import { App } from 'obsidian';
import { YamlProcessor } from '../../yaml-processor';
import { ChatClient } from '../../../api/chat-client';
import { FileOperations, FileUtils } from '../../file-operations';
import { PathUtils } from '../../path-resolver';
import { OutputHandler } from './OutputHandler';
import { 
    ResolvedPipelineStep,
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
    private outputHandler: OutputHandler;

    constructor(app: App) {
        this.app = app;
        this.yamlProcessor = new YamlProcessor(app);
        this.fileOps = new FileOperations(app);
        this.outputHandler = new OutputHandler(app);
    }

    async execute(
        stepId: string,
        fileInfo: FileInfo,
        resolvedStep: ResolvedPipelineStep
    ): Promise<ProcessingResult> {
        const startTime = new Date();

        try {
            // Validate input parameters
            this.validateInput(stepId, fileInfo, resolvedStep);

            logger.info(`Starting chat processing: ${fileInfo.name} with ${resolvedStep.modelConfig.model}`);

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
                resolvedStep.include || [],
                context,
                resolvedStep.next // Pass next steps for routing
            );

            // Create chat client and process request using resolved model config
            const chatClient = new ChatClient({
                apiKey: resolvedStep.modelConfig.apiKey,
                baseUrl: resolvedStep.modelConfig.baseUrl,
                organization: resolvedStep.modelConfig.organization
            });

            const parsedResponse = await chatClient.processYamlRequest(yamlRequest, {
                model: resolvedStep.modelConfig.model,
                temperature: 0.1
            });

            // Archive input file using FileOperations directly
            let archivePath: string;
            try {
                const pathContext = FileUtils.createProcessingContext(fileInfo, stepId);
                const archiveResult = await this.fileOps.archiveFile(
                    fileInfo.path, 
                    resolvedStep.archive, 
                    pathContext
                );
                archivePath = archiveResult.archivePath;
                logger.debug(`File archived: ${fileInfo.path} → ${archivePath}`);
            } catch (error) {
                logger.warn(`Failed to archive file: ${fileInfo.path}`, error);
                archivePath = fileInfo.path; // Return original path if archiving fails
            }
            context.archivePath = archivePath;

            // Save output files with direct content output - create legacy step object for OutputHandler compatibility  
            const outputStepCompat: PipelineStep = {
                modelConfig: stepId, // Not used by OutputHandler but needed for interface
                input: resolvedStep.input,
                output: resolvedStep.output,
                archive: resolvedStep.archive,
                include: resolvedStep.include,
                next: resolvedStep.next,
                description: resolvedStep.description
            };
            
            const outputFiles: string[] = [];
            let nextStep: string | undefined;

            // Determine if output is a directory pattern
            const isDirectoryOutput = this.isDirectoryOutput(resolvedStep.output);

            // Handle different response types and output patterns
            if (parsedResponse.isMultiFile) {
                // Multi-file response: always use appropriate method based on output pattern
                if (isDirectoryOutput) {
                    const savedFiles = await this.outputHandler.saveToDirectory(parsedResponse.sections, outputStepCompat, context);
                    outputFiles.push(...Object.values(savedFiles));
                } else {
                    const savedFiles = await this.outputHandler.saveMultiple(parsedResponse.sections, outputStepCompat, context);
                    outputFiles.push(...Object.values(savedFiles));
                }
                
                // Get nextStep from first section that has it
                nextStep = parsedResponse.sections.find(section => section.nextStep)?.nextStep;
            } else if (parsedResponse.sections.length > 0) {
                // Single-file response: check if output pattern is directory
                if (isDirectoryOutput) {
                    // Even for single-file responses, use saveToDirectory if output is a directory pattern
                    const savedFiles = await this.outputHandler.saveToDirectory(parsedResponse.sections, outputStepCompat, context);
                    outputFiles.push(...Object.values(savedFiles));
                } else {
                    // Regular file output pattern
                    const outputPath = await this.outputHandler.save(parsedResponse.sections[0], outputStepCompat, context);
                    outputFiles.push(outputPath);
                }
                nextStep = parsedResponse.sections[0].nextStep;
            }

            // Validate nextStep if present
            if (nextStep) {
                if (!resolvedStep.next || !resolvedStep.next[nextStep]) {
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
     * Check if an output pattern represents a directory
     */
    private isDirectoryOutput(outputPattern: string): boolean {
        // Directory patterns either end with '/' or don't contain {filename} variable
        return outputPattern.endsWith('/') || !outputPattern.includes('{filename}');
    }

    /**
     * Validate input parameters for chat execution
     */
    private validateInput(stepId: string, fileInfo: FileInfo, resolvedStep: ResolvedPipelineStep): void {
        // Validate stepId
        if (!stepId || typeof stepId !== 'string') {
            throw ErrorFactory.validation(
                'Invalid stepId provided to ChatStepExecutor',
                'Step ID must be a non-empty string',
                { stepId },
                ['Provide a valid step ID string']
            );
        }

        // Validate resolved step configuration
        if (!resolvedStep) {
            throw ErrorFactory.validation(
                'No resolved step configuration provided to ChatStepExecutor',
                'Resolved pipeline step configuration is required',
                { stepId },
                ['Ensure step configuration is properly resolved', 'Check ConfigurationResolver is working']
            );
        }

        // Validate model configuration exists
        if (!resolvedStep.modelConfig) {
            throw ErrorFactory.validation(
                'No model configuration in resolved step',
                'Model configuration is required for chat processing',
                { stepId, resolvedStep },
                ['Ensure model config reference is valid', 'Check models configuration contains referenced config']
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
            filePath: fileInfo.path,
            modelConfig: resolvedStep.modelConfig.model
        });
    }
}