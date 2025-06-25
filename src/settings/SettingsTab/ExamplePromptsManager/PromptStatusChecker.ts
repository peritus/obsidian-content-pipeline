import { PromptFileOperations, PromptStatus } from '../prompt-file-operations';

/**
 * Handles checking the status of prompt files
 */
export class PromptStatusChecker {
    constructor(private fileOps: PromptFileOperations) {}

    /**
     * Check which prompts exist with error handling
     */
    async checkPromptsStatus(examplePrompts: Record<string, string>): Promise<PromptStatus[]> {
        return await this.fileOps.checkPromptsStatus(examplePrompts);
    }

    /**
     * Separate prompts by their status - config-based vs vault-based
     */
    categorizePrompts(promptsStatus: PromptStatus[]): {
        configBased: PromptStatus[];
        vaultBased: PromptStatus[];
        errors: PromptStatus[];
    } {
        return {
            configBased: promptsStatus.filter(p => !p.exists && !p.error),
            vaultBased: promptsStatus.filter(p => p.exists),
            errors: promptsStatus.filter(p => p.error)
        };
    }
}
