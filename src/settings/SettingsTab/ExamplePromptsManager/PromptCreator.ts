import { PromptFileOperations, PromptStatus } from '../prompt-file-operations';
import { Notice } from 'obsidian';

/**
 * Handles creating prompt files with enhanced error reporting
 */
export class PromptCreator {
    constructor(private fileOps: PromptFileOperations) {}

    /**
     * Move a prompt from config to vault (replaces createSinglePrompt)
     */
    async movePromptToVault(prompt: PromptStatus): Promise<void> {
        try {
            new Notice(`🔄 Copying ${prompt.path} to vault...`);
            await this.fileOps.createPromptFile(prompt.path, prompt.content);
            new Notice(`✅ Copied prompt to vault: ${prompt.path}`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            new Notice(`❌ Failed to copy ${prompt.path}: ${errorMessage}`);
            console.error(`Failed to copy prompt ${prompt.path}:`, error);
        }
    }

    /**
     * Create a single prompt with enhanced error handling (legacy method for compatibility)
     */
    async createSinglePrompt(prompt: PromptStatus): Promise<void> {
        // This legacy method now delegates to the new movePromptToVault method
        await this.movePromptToVault(prompt);
    }
}
