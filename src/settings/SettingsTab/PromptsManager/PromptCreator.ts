import { PromptFileOperations, PromptStatus } from '../prompt-file-operations';
import { Notice } from 'obsidian';

/**
 * Handles copying prompts from configuration to vault with enhanced user feedback
 */
export class PromptCreator {
    constructor(private fileOps: PromptFileOperations) {}

    /**
     * Copy a prompt from configuration to vault for editing
     * Enhanced with progress feedback and user guidance
     */
    async copyToVault(prompt: PromptStatus): Promise<void> {
        try {
            new Notice(`🔄 Copying ${prompt.path} to vault...`);
            await this.fileOps.createPromptFile(prompt.path, prompt.content);
            new Notice(`✅ Copied prompt to vault: ${prompt.path}. You can now edit it!`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            new Notice(`❌ Failed to copy ${prompt.path}: ${errorMessage}`);
            console.error(`Failed to copy prompt ${prompt.path}:`, error);
        }
    }
}
