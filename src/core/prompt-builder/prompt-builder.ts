/**
 * Prompt Builder for Structured Output
 * 
 * Replaces YAML formatter with simple prompt building for OpenAI structured output.
 * No YAML frontmatter needed - JSON schema enforces structure.
 */

import { App } from 'obsidian';
import { FileOperations, FileUtils } from '../file-operations';
import { FileInfo, ProcessingContext } from '../../types';
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
        includeFiles: string[],
        context: ProcessingContext,
        availableNextSteps?: string[]
    ): Promise<string> {
        try {
            const sections: string[] = [];
            
            // Add input content
            const inputContent = await this.readFileContent(fileInfo.path);
            // Strip frontmatter to prevent doubling
            const cleanInputContent = FileUtils.stripFrontmatter(inputContent);
            sections.push(`INPUT FILE: ${fileInfo.name}\n${cleanInputContent}`);
            
            // Add include files
            for (const includePath of includeFiles) {
                const content = await this.readFileContent(includePath);
                const filename = includePath.split('/').pop() || includePath;
                
                // Determine section label based on file type
                const label = this.determineSectionLabel(includePath);
                sections.push(`${label}: ${filename}\n${content}`);
            }
            
            // Add routing instructions if needed
            if (availableNextSteps?.length) {
                const routingInstructions = this.buildRoutingInstructions(availableNextSteps);
                sections.push(`ROUTING OPTIONS: ${availableNextSteps.join(', ')}\n${routingInstructions}`);
            }
            
            const prompt = sections.join('\n\n');
            logger.debug(`Prompt built: ${sections.length} sections, ${prompt.length} chars`);
            
            return prompt;

        } catch (error) {
            throw ErrorFactory.parsing(
                `Failed to build prompt: ${error instanceof Error ? error.message : String(error)}`,
                'Could not create prompt for LLM processing',
                { fileInfo, includeFiles, context, originalError: error },
                ['Check file accessibility', 'Verify include file paths']
            );
        }
    }

    private async readFileContent(filePath: string): Promise<string> {
        try {
            return await this.fileOps.readFile(filePath);
        } catch (error) {
            logger.warn(`Could not read file: ${filePath}`, error);
            return `[File not found: ${filePath}]`;
        }
    }

    private determineSectionLabel(filePath: string): string {
        if (filePath.toLowerCase().includes('prompt')) {
            return 'PROMPT';
        }
        return 'CONTEXT';
    }

    private buildRoutingInstructions(availableNextSteps: string[]): string {
        return [
            'Choose specific filenames based on actual content, not generic categories.',
            'Use main action or key details from content:',
            '- "Buy 3x Tomatoes at Supermarket.md" NOT "Shopping List.md"',
            '- "Call John about Budget Meeting.md" NOT "Phone Calls.md"',
            '- "Fix Kitchen Sink This Weekend.md" NOT "Home Repairs.md"',
            '',
            'Use the nextStep field to route content to the most appropriate processing step.',
            '',
            `Available routing options: ${availableNextSteps.join(', ')}`
        ].join('\n');
    }
}