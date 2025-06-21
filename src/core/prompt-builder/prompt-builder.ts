/**
 * Prompt Builder for Explicit Configuration
 * 
 * Builds prompts using explicit prompts and context arrays instead of magic filename detection.
 * Provides clear separation between LLM instructions and reference material.
 */

import { App } from 'obsidian';
import { FileOperations, FileUtils } from '../file-operations';
import { FileInfo, ProcessingContext, ResolvedPipelineStep } from '../../types';
import { ErrorFactory } from '../../error-handler';
import { createLogger } from '../../logger';

const logger = createLogger('PromptBuilder');

export class PromptBuilder {
    private fileOps: FileOperations;

    constructor(app: App) {
        this.fileOps = FileUtils.create(app);
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
            const content = await this.readFileContent(contextFile);
            const filename = contextFile.split('/').pop() || contextFile;
            contexts.push(`=== ${filename} ===\n${content}`);
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
            return await this.fileOps.readFile(filePath);
        } catch (error) {
            logger.warn(`Could not read file: ${filePath}`, error);
            return `[File not found: ${filePath}]`;
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