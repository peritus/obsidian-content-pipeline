/**
 * Step Chain Execution with Full API Integration
 */

import { App } from 'obsidian';
import { WhisperStepProcessor } from './whisper-step';
import { YamlProcessor } from '../yaml-processor';
import { ChatClient } from '../../api/chat-client';
import { FileOperations, FileUtils } from '../file-operations';
import { PathResolver, PathUtils } from '../path-resolver';
import { TemplateEngine } from '../template-engine';
import { 
    AudioInboxSettings,
    PipelineConfiguration, 
    PipelineStep,
    FileInfo, 
    ProcessingResult, 
    ProcessingStatus,
    ProcessingContext,
    TemplateVariables
} from '../../types';
import { ErrorFactory } from '../../error-handler';
import { createLogger } from '../../logger';

const logger = createLogger('StepChain');

export class StepChain {
    private app: App;
    private settings: AudioInboxSettings;
    private whisperProcessor: WhisperStepProcessor;
    private yamlProcessor: YamlProcessor;
    private fileOps: FileOperations;
    private templateEngine: TemplateEngine;

    constructor(app: App, settings: AudioInboxSettings) {
        this.app = app;
        this.settings = settings;
        this.whisperProcessor = new WhisperStepProcessor(app);
        this.yamlProcessor = new YamlProcessor(app);
        this.fileOps = new FileOperations(app);
        this.templateEngine = new TemplateEngine(app);
        logger.debug('StepChain initialized with full API support');
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
                { stepId }
            );
        }

        const startTime = new Date();

        try {
            logger.info(`Executing step: ${stepId} for file: ${fileInfo.path}`);

            // Check API key
            if (!step.apiKey || step.apiKey.trim() === '') {
                throw ErrorFactory.configuration(
                    'No API key configured for step',
                    `Step "${stepId}" requires an API key`,
                    { stepId, model: step.model },
                    ['Configure API key in pipeline settings', 'Add valid OpenAI API key']
                );
            }

            // Route to appropriate processor based on model
            if (step.model === 'whisper-1' && WhisperStepProcessor.isAudioFile(fileInfo)) {
                return await this.whisperProcessor.executeWhisperStep(stepId, fileInfo, step);
            } else if (this.isChatModel(step.model)) {
                return await this.executeChatStep(stepId, fileInfo, step);
            }

            // Unsupported model
            throw ErrorFactory.pipeline(
                `Unsupported model: ${step.model}`,
                `Model "${step.model}" is not supported`,
                { stepId, model: step.model },
                ['Use whisper-1 for audio transcription', 'Use gpt-4, gpt-3.5-turbo, or other chat models for text processing']
            );

        } catch (error) {
            logger.error(`Step execution failed: ${stepId}`, error);
            
            // Return failed result instead of throwing
            return {
                inputFile: fileInfo,
                status: ProcessingStatus.FAILED,
                outputFiles: [],
                startTime,
                endTime: new Date(),
                stepId,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    async executeChain(
        startStepId: string, 
        inputFile: FileInfo, 
        config: PipelineConfiguration
    ): Promise<ProcessingResult> {
        let currentStepId = startStepId;
        let currentFile = inputFile;
        let allResults: ProcessingResult[] = [];

        try {
            logger.info(`Starting chain execution: ${startStepId} for ${inputFile.path}`);

            while (currentStepId) {
                // Execute current step
                const result = await this.executeStep(currentStepId, currentFile, config);
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

    private async executeChatStep(
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
            const archivePath = await this.archiveInputFile(fileInfo, step, stepId);
            context.archivePath = archivePath;

            // Save output files using template engine
            const outputFiles: string[] = [];
            for (const section of parsedResponse.sections) {
                const outputPath = await this.saveOutputFile(section, step, context);
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

    private async saveOutputFile(
        section: any,
        step: PipelineStep,
        context: ProcessingContext
    ): Promise<string> {
        // Resolve output path with filename from section
        const pathContext = FileUtils.createProcessingContext({
            ...context,
            filename: PathUtils.getBasename(section.filename || 'output')
        } as any, context.stepId);

        const outputResult = PathResolver.resolvePath(step.output, pathContext);
        const outputPath = outputResult.resolvedPath;

        try {
            // Create template variables from context and section
            const templateVariables: TemplateVariables = {
                category: section.category || context.resolvedCategory,
                filename: section.filename || PathUtils.getBasename(outputPath),
                timestamp: context.timestamp,
                date: context.date,
                archivePath: context.archivePath,
                inputPath: context.inputPath,
                outputPath: outputPath,
                stepId: context.stepId,
                originalCategory: context.originalCategory,
                resolvedCategory: context.resolvedCategory
            };

            // Process template with variables and content
            const templateResult = await this.templateEngine.processTemplate(
                step.template,
                templateVariables,
                section.content
            );

            // Write processed content to file
            await this.fileOps.writeFile(outputPath, templateResult.content, {
                createDirectories: true,
                overwrite: true
            });

            logger.debug(`Output file saved with template: ${outputPath}`);
            return outputPath;

        } catch (error) {
            logger.warn(`Template processing failed for ${outputPath}, using fallback`, error);
            
            // Fallback to simple content creation if template fails
            const content = `---
source: "${context.archivePath}"
processed: "${context.timestamp}"
step: "${context.stepId}"
category: "${section.category || context.resolvedCategory}"
filename: "${section.filename || 'output.md'}"
---

${section.content}`;

            await this.fileOps.writeFile(outputPath, content, {
                createDirectories: true,
                overwrite: true
            });

            logger.debug(`Output file saved with fallback: ${outputPath}`);
            return outputPath;
        }
    }

    private async archiveInputFile(
        fileInfo: FileInfo,
        step: PipelineStep,
        stepId: string
    ): Promise<string> {
        try {
            const pathContext = FileUtils.createProcessingContext(fileInfo, stepId);
            const archiveResult = await this.fileOps.archiveFile(
                fileInfo.path, 
                step.archive, 
                pathContext
            );
            
            logger.debug(`File archived: ${fileInfo.path} → ${archiveResult.archivePath}`);
            return archiveResult.archivePath;

        } catch (error) {
            logger.warn(`Failed to archive file: ${fileInfo.path}`, error);
            return fileInfo.path; // Return original path if archiving fails
        }
    }

    private isChatModel(model: string): boolean {
        const chatModels = ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo', 'gpt-4o'];
        return chatModels.some(chatModel => model.startsWith(chatModel));
    }
}
