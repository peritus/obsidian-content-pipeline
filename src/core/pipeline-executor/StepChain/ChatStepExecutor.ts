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
            logger.info(`Starting chat processing: ${fileInfo.name} with ${step.model}`);

            // Create processing context
            const context: ProcessingContext = {
                originalCategory: fileInfo.category,
                resolvedCategory: fileInfo.category,
                filename: PathUtils.getBasename(fileInfo.path),
                timestamp: FileUtils.generateTimestamp(),
                date: new Date().toISOString().split('T')[0],
                archivePath: '', // Will be set after archiving
                stepId,
                inputPath: fileInfo.path,
                outputPath: '' // Will be resolved per output file
            };

            // Format YAML request
            const yamlRequest = await this.yamlProcessor.formatRequest(
                fileInfo,
                step.include || [],
                context,
                { includeCategory: true }
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

            // Save output files using template engine
            const outputFiles: string[] = [];
            for (const section of parsedResponse.sections) {
                const outputPath = await this.outputHandler.save(section, step, context);
                outputFiles.push(outputPath);
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
                nextStep: step.next
            };

        } catch (error) {
            logger.error(`Chat processing failed: ${fileInfo.name}`, error);
            throw error;
        }
    }
}
