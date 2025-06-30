import { PromptFileOperations, PromptStatus } from '../prompt-file-operations';
import { Notice } from 'obsidian';

/**
 * Handles copying prompts from configuration to vault with enhanced user feedback
 */
export class PromptCreator {
    constructor(private fileOps: PromptFileOperations) {}

    /**
     * Copy a prompt from configuration to vault for customization
     * Enhanced with progress feedback and user guidance
     */
    async copyPromptToVault(prompt: PromptStatus): Promise<void> {
        try {
            new Notice(`🔄 Copying ${prompt.path} to vault...`);
            await this.fileOps.createPromptFile(prompt.path, prompt.content);
            new Notice(`✅ Copied prompt to vault: ${prompt.path}. You can now customize it!`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            new Notice(`❌ Failed to copy ${prompt.path}: ${errorMessage}`);
            console.error(`Failed to copy prompt ${prompt.path}:`, error);
        }
    }

    /**
     * Move prompt to vault (delegates to copyPromptToVault)
     */
    async movePromptToVault(prompt: PromptStatus): Promise<void> {
        await this.copyPromptToVault(prompt);
    }

    /**
     * Create single prompt (delegates to copyPromptToVault)
     */
    async createSinglePrompt(prompt: PromptStatus): Promise<void> {
        await this.copyPromptToVault(prompt);
    }
}
