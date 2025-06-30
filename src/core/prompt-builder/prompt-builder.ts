/**
 * Prompt Builder for Explicit Configuration
 * 
 * Builds prompts using explicit prompts and context arrays instead of magic filename detection.
 * Provides clear separation between LLM instructions and reference material.
 */

import { App } from 'obsidian';
import { FileOperations, FileUtils } from '../file-operations';
import { FileInfo, ProcessingContext, ResolvedPipelineStep, ContentPipelineSettings } from '../../types';
import { ErrorFactory } from '../../error-handler';
import { createLogger } from '../../logger';

const logger = createLogger('PromptBuilder');

export class PromptBuilder {
    private fileOps: FileOperations;
    private settings?: ContentPipelineSettings;

    constructor(app: App, settings?: ContentPipelineSettings) {
        this.fileOps = FileUtils.create(app);
        this.settings = settings;
        logger.debug('PromptBuilder initialized');
    }

    async buildPrompt(
        fileInfo: FileInfo,
        resolvedStep: ResolvedPipelineStep,
        context: ProcessingContext,
        availableNextSteps?: string[]
    ): Promise<string> {
        try {
            const sections: string[] = [];
            
            // 1. System instructions from explicit prompts
            if (resolvedStep.prompts?.length) {
                const systemInstructions = await this.buildSystemInstructions(resolvedStep.prompts);
                sections.push(systemInstructions);
            }
            
            // 2. Reference context from explicit context files
            if (resolvedStep.context?.length) {
                const referenceContext = await this.buildReferenceContext(resolvedStep.context);
                sections.push(referenceContext);
            }
            
            // 3. Input content (the actual file to process)
            const inputContent = await this.buildInputContent(fileInfo);
            sections.push(inputContent);
            
            // 4. Routing instructions if needed
            if (availableNextSteps?.length) {
                const routingInstructions = this.buildRoutingInstructions(availableNextSteps);
                sections.push(routingInstructions);
            }
            
            // 5. Explicit processing directive
            sections.push(this.buildProcessingDirective());
            
            const prompt = sections.join('\n\n');
            logger.debug(`Prompt built: ${resolvedStep.prompts?.length || 0} prompts, ${resolvedStep.context?.length || 0} context files, ${prompt.length} chars`);
            
            return prompt;

        } catch (error) {
            throw ErrorFactory.parsing(
                `Failed to build prompt: ${error instanceof Error ? error.message : String(error)}`,
                'Could not create prompt for LLM processing',
                { fileInfo, resolvedStep, context, originalError: error },
                ['Check file accessibility', 'Verify prompt and context file paths']
            );
        }
    }

    private async buildSystemInstructions(promptFiles: string[]): Promise<string> {
        const instructions: string[] = [];
        
        for (const promptFile of promptFiles) {
            const content = await this.readFileContent(promptFile);
            instructions.push(content);
        }
        
        return `<system_instructions>\n${instructions.join('\n\n')}\n</system_instructions>`;
    }

    private async buildReferenceContext(contextFiles: string[]): Promise<string> {
        const contexts: string[] = [];
        
        for (const contextFile of contextFiles) {
            try {
                // Check if file exists before attempting to read
                if (!this.fileOps.fileExists(contextFile)) {
                    logger.info(`Context file not found, skipping: ${contextFile}`);
                    continue;
                }
                
                const content = await this.readFileContent(contextFile);
                const filename = contextFile.split('/').pop() || contextFile;
                contexts.push(`<file filename="${filename}">\n${content}\n</file>`);
            } catch (error) {
                logger.warn(`Failed to read context file, skipping: ${contextFile}`, error);
                continue;
            }
        }
        
        if (contexts.length === 0) {
            logger.info('No context files available - proceeding without reference context');
            return ''; // Return empty string instead of context section
        }
        
        return `<reference_context>\n${contexts.join('\n\n')}\n</reference_context>`;
    }

    private async buildInputContent(fileInfo: FileInfo): Promise<string> {
        const content = await this.readFileContent(fileInfo.path);
        const cleanContent = FileUtils.stripFrontmatter(content);
        return `<input_content>\n${cleanContent}\n</input_content>`;
    }

    private buildProcessingDirective(): string {
        return `IMPORTANT: Generate output ONLY for the content in the <input_content> section. Do not create separate outputs for system instructions or reference context.`;
    }

    private async readFileContent(filePath: string): Promise<string> {
        try {
            // First, try to read from vault
            return await this.fileOps.readFile(filePath);
        } catch (error) {
            logger.debug(`File not found in vault: ${filePath}, checking config-defined prompts`);
            
            // If vault read fails, try to find it in config-defined prompts with exact path match
            if (this.settings?.configDefinedPrompts) {
                if (this.settings.configDefinedPrompts[filePath]) {
                    logger.debug(`Found config-defined prompt for exact path: ${filePath}`);
                    return this.settings.configDefinedPrompts[filePath];
                }
            }
            
            // If no match found, throw error to abort processing
            throw ErrorFactory.parsing(
                `Prompt file not found: ${filePath}`,
                `Required prompt file "${filePath}" was not found in vault or config-defined prompts`,
                { filePath, availableConfigDefinedPrompts: this.settings?.configDefinedPrompts ? Object.keys(this.settings.configDefinedPrompts) : [] },
                [
                    'Create the prompt file in your vault', 
                    'Check the file path is correct',
                    'Ensure config-defined prompts are properly imported if using configurations'
                ]
            );
        }
    }

    private buildRoutingInstructions(availableNextSteps: string[]): string {
        return [
            '<routing_instructions>',
            'Choose specific filenames based on actual content, not generic categories.',
            'Use main action or key details from content:',
            '- "Buy 3x Tomatoes at Supermarket.md" NOT "Shopping List.md"',
            '- "Call John about Budget Meeting.md" NOT "Phone Calls.md"',
            '- "Fix Kitchen Sink This Weekend.md" NOT "Home Repairs.md"',
            '',
            'Use the nextStep field to route content to the most appropriate processing step.',
            '',
            `Available routing options: ${availableNextSteps.join(', ')}`,
            '</routing_instructions>'
        ].join('\n');
    }
}