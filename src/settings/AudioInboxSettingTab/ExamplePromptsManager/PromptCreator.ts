import { PromptFileOperations, PromptStatus } from '../prompt-file-operations';
import { NotificationManager } from '../notification-manager';

/**
 * Handles creating prompt files with enhanced error reporting
 */
export class PromptCreator {
    constructor(private fileOps: PromptFileOperations) {}

    /**
     * Create all missing prompts with improved error reporting
     */
    async createAllMissingPrompts(missingPrompts: PromptStatus[]): Promise<void> {
        let created = 0;
        let failed = 0;
        const errors: string[] = [];

        NotificationManager.showNotice('🔄 Creating prompt files...');

        for (const prompt of missingPrompts) {
            try {
                await this.fileOps.createPromptFile(prompt.path, prompt.content);
                created++;
            } catch (error) {
                failed++;
                const errorMessage = error instanceof Error ? error.message : String(error);
                errors.push(`${prompt.path}: ${errorMessage}`);
                console.error(`Failed to create prompt ${prompt.path}:`, error);
            }
        }

        this.showCreationResults(created, failed, errors);
    }

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

    /**
     * Show detailed result notification for batch creation
     */
    private showCreationResults(created: number, failed: number, errors: string[]): void {
        if (failed === 0) {
            NotificationManager.showNotice(`✅ Successfully created all ${created} prompt files!`);
        } else {
            NotificationManager.showNotice(`⚠️ Created ${created} prompts, ${failed} failed. Check console for details.`);
            console.error('Failed prompt creations:', errors);
        }
    }
}
