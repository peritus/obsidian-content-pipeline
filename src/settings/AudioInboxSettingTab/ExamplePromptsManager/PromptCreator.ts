import { PromptFileOperations, PromptStatus } from '../prompt-file-operations';
import { NotificationManager } from '../notification-manager';

/**
 * Handles creating prompt files with enhanced error reporting
 */
export class PromptCreator {
    constructor(private fileOps: PromptFileOperations) {}

    /**
     * Create a single prompt with enhanced error handling
     */
    async createSinglePrompt(prompt: PromptStatus): Promise<void> {
        try {
            NotificationManager.showNotice(`🔄 Creating ${prompt.path}...`);
            await this.fileOps.createPromptFile(prompt.path, prompt.content);
            NotificationManager.showNotice(`✅ Created prompt: ${prompt.path}`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            NotificationManager.showNotice(`❌ Failed to create ${prompt.path}: ${errorMessage}`);
            console.error(`Failed to create prompt ${prompt.path}:`, error);
        }
    }
}
