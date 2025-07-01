/**
 * Chat Step Execution Logic with Structured Output Support
 */

import { App } from 'obsidian';
import { PromptBuilder } from '../../prompt-builder';
import { ChatClient } from '../../../api/chat-client';
import { FileOperations, FileUtils } from '../../file-operations';
import { FilenameResolver } from '../../FilenameResolver';
import { OutputHandler } from './OutputHandler';
import { 
    ResolvedPipelineStep,
    PipelineStep,
    FileInfo, 
    ProcessingResult, 
    ProcessingStatus,
    ProcessingContext,
    isRoutingAwareOutput,
    RoutingAwareOutput,
    ContentPipelineSettings
} from '../../../types';
import { ErrorFactory } from '../../../error-handler';
import { createLogger } from '../../../logger';

const logger = createLogger('ChatStepExecutor');

export class ChatStepExecutor {
    private app: App;
    private promptBuilder: PromptBuilder;
    private fileOps: FileOperations;
    private outputHandler: OutputHandler;

    constructor(app: App, settings?: ContentPipelineSettings) {
        this.app = app;
        this.promptBuilder = new PromptBuilder(app, settings);
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

            // Create processing context with routing preparation
            const context: ProcessingContext = {
                filename: FilenameResolver.getBasename(fileInfo.path),
                timestamp: FileUtils.generateTimestamp(),
                date: new Date().toISOString().split('T')[0],
                archivePath: '', // Will be set after archiving
                stepId,
                inputPath: fileInfo.path,
                outputPath: '' // Will be resolved per output file based on routing
            };

            // Build prompt using explicit configuration
            const prompt = await this.promptBuilder.buildPrompt(
                fileInfo,
                resolvedStep,  // NEW WAY - pass entire resolved step
                context,
                this.getAvailableNextSteps(resolvedStep)
            );

            // Create chat client and process request using structured output
            const chatClient = new ChatClient({
                apiKey: resolvedStep.modelConfig.apiKey,
                baseUrl: resolvedStep.modelConfig.baseUrl,
                organization: resolvedStep.modelConfig.organization
            });

            const processedResponse = await chatClient.processStructuredRequest(
                prompt,
                this.getAvailableNextSteps(resolvedStep),
                {
                    model: resolvedStep.modelConfig.model,
                    temperature: 0.1
                }
            );

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

            // Validate routing decisions and resolve output paths
            const routingValidation = this.validateRoutingDecisions(processedResponse.sections, resolvedStep);
            logger.debug("Routing validation completed", routingValidation);

            // Create step object for OutputHandler compatibility with routing-aware output support
            const outputStepCompat: PipelineStep = {
                modelConfig: stepId, // Not used by OutputHandler but needed for interface
                input: resolvedStep.input,
                output: resolvedStep.routingAwareOutput || resolvedStep.output, // Use routing-aware output if available
                archive: resolvedStep.archive,
                prompts: resolvedStep.prompts,
                context: resolvedStep.context,
                description: resolvedStep.description
            };
            
            const outputFiles: string[] = [];
            let nextStep: string | undefined;
            const routingDecisions: Array<{
                section: string;
                nextStep?: string;
                usedDefaultFallback: boolean;
                resolvedOutputPath: string;
            }> = [];

            // Process routing decisions and prepare context
            for (const section of processedResponse.sections) {
                const sectionRoutingDecision = this.createRoutingDecision(section, resolvedStep);
                routingDecisions.push(sectionRoutingDecision);
                
                // Set the first valid nextStep as the overall nextStep for the processing result
                if (!nextStep && sectionRoutingDecision.nextStep && this.isValidNextStep(sectionRoutingDecision.nextStep, resolvedStep)) {
                    nextStep = sectionRoutingDecision.nextStep;
                }
            }

            // Update context with comprehensive routing information
            context.routingDecision = {
                nextStep: nextStep,
                usedDefaultFallback: routingDecisions.some(rd => rd.usedDefaultFallback),
                resolvedOutputPath: '', // Will be set per section
                availableOptions: this.getAvailableNextSteps(resolvedStep)
            };

            // Handle different response types with unified output handling
            if (processedResponse.isMultiFile) {
                // Multi-file response: use saveMultiple for all cases
                const savedFiles = await this.outputHandler.saveMultiple(processedResponse.sections, outputStepCompat, context);
                outputFiles.push(...Object.values(savedFiles));
                
                // Get nextStep from first section that has a valid one
                const validNextStep = processedResponse.sections.find(section => 
                    section.nextStep && this.isValidNextStep(section.nextStep, resolvedStep)
                )?.nextStep;
                if (validNextStep) {
                    nextStep = validNextStep;
                }
            } else if (processedResponse.sections.length > 0) {
                // Single-file response: use unified save method
                const section = processedResponse.sections[0];
                
                // Update context with specific routing decision for this section
                const sectionContext = {
                    ...context,
                    routingDecision: {
                        nextStep: section.nextStep,
                        usedDefaultFallback: !section.nextStep || !this.isValidNextStep(section.nextStep, resolvedStep),
                        resolvedOutputPath: this.outputHandler.resolveOutputDirectory(outputStepCompat, section.nextStep),
                        availableOptions: this.getAvailableNextSteps(resolvedStep)
                    }
                };

                // Use unified save method for all single-file responses
                const outputPath = await this.outputHandler.save(section, outputStepCompat, sectionContext);
                outputFiles.push(outputPath);
                
                // Validate and set nextStep
                if (section.nextStep && this.isValidNextStep(section.nextStep, resolvedStep)) {
                    nextStep = section.nextStep;
                } else if (section.nextStep) {
                    const availableNextSteps = this.getAvailableNextSteps(resolvedStep);
                    logger.warn(`Invalid nextStep '${section.nextStep}' not found in step configuration. Available options: ${availableNextSteps.join(', ')}`);
                    nextStep = undefined;
                }
            }

            // Create comprehensive routing decision metadata for result
            const finalRoutingDecision = {
                availableOptions: this.getAvailableNextSteps(resolvedStep),
                chosenOption: nextStep,
                usedDefaultFallback: routingDecisions.some(rd => rd.usedDefaultFallback),
                resolvedOutputPath: outputFiles[0] || '', // Use first output file as representative
                routingConfig: isRoutingAwareOutput(outputStepCompat.output) ? outputStepCompat.output as RoutingAwareOutput : undefined
            };

            logger.info(`Chat processing completed with structured output: ${fileInfo.name} → ${outputFiles.length} files, nextStep: ${nextStep || 'none'}`);

            return {
                inputFile: fileInfo,
                status: ProcessingStatus.COMPLETED,
                outputFiles,
                archivePath,
                startTime,
                endTime: new Date(),
                stepId,
                nextStep,
                routingDecision: finalRoutingDecision
            };

        } catch (error) {
            logger.error(`Chat processing failed: ${fileInfo?.name || 'unknown file'}`, error);
            throw error;
        }
    }

    /**
     * Get available next steps from routing-aware output only
     */
    private getAvailableNextSteps(resolvedStep: ResolvedPipelineStep): string[] {
        // Use routing-aware output keys if available
        if (resolvedStep.routingAwareOutput && isRoutingAwareOutput(resolvedStep.routingAwareOutput)) {
            return Object.keys(resolvedStep.routingAwareOutput).filter(key => key !== 'default');
        }

        // No routing-aware output configured
        return [];
    }

    /**
     * Validate routing decisions from LLM response against step configuration
     */
    private validateRoutingDecisions(sections: any[], resolvedStep: ResolvedPipelineStep): {
        hasValidRoutes: boolean;
        invalidRoutes: string[];
        fallbacksUsed: number;
        totalSections: number;
    } {
        const availableNextSteps = this.getAvailableNextSteps(resolvedStep);
        const invalidRoutes: string[] = [];
        let fallbacksUsed = 0;

        for (const section of sections) {
            if (section.nextStep) {
                if (!availableNextSteps.includes(section.nextStep)) {
                    invalidRoutes.push(section.nextStep);
                    fallbacksUsed++;
                }
            } else {
                // No nextStep provided counts as using default fallback
                fallbacksUsed++;
            }
        }

        return {
            hasValidRoutes: invalidRoutes.length === 0,
            invalidRoutes,
            fallbacksUsed,
            totalSections: sections.length
        };
    }

    /**
     * Create routing decision metadata for a section
     */
    private createRoutingDecision(section: any, resolvedStep: ResolvedPipelineStep): {
        section: string;
        nextStep?: string;
        usedDefaultFallback: boolean;
        resolvedOutputPath: string;
    } {
        const isValid = section.nextStep && this.isValidNextStep(section.nextStep, resolvedStep);
        
        // Create temporary step object for output path resolution
        const stepForResolution: PipelineStep = {
            modelConfig: resolvedStep.stepId,
            input: resolvedStep.input,
            output: resolvedStep.routingAwareOutput || resolvedStep.output,
            archive: resolvedStep.archive,
            prompts: resolvedStep.prompts,
            context: resolvedStep.context,
            description: resolvedStep.description
        };

        return {
            section: section.filename || 'unnamed',
            nextStep: isValid ? section.nextStep : undefined,
            usedDefaultFallback: !isValid,
            resolvedOutputPath: this.outputHandler.resolveOutputDirectory(stepForResolution, isValid ? section.nextStep : undefined)
        };
    }

    /**
     * Check if a nextStep is valid according to step configuration
     * Now supports only routing-aware output
     */
    private isValidNextStep(nextStep: string, resolvedStep: ResolvedPipelineStep): boolean {
        const availableNextSteps = this.getAvailableNextSteps(resolvedStep);
        return availableNextSteps.includes(nextStep);
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

        // Validate prompt configuration
        if (!resolvedStep.prompts || resolvedStep.prompts.length === 0) {
            logger.warn(`Step '${stepId}' has no prompt files configured. This may result in poor LLM performance.`);
        }
        
        // Context files are optional, so no validation needed

        // Log validation success
        logger.debug('Input validation passed', { 
            stepId, 
            fileName: fileInfo.name, 
            filePath: fileInfo.path,
            modelConfig: resolvedStep.modelConfig.model,
            promptFiles: resolvedStep.prompts?.length || 0,
            contextFiles: resolvedStep.context?.length || 0,
            hasRoutingAwareOutput: !!resolvedStep.routingAwareOutput,
            availableNextSteps: this.getAvailableNextSteps(resolvedStep)
        });
    }
}