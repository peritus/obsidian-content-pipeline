import { PromptFileOperations, PromptStatus } from '../prompt-file-operations';

/**
 * Handles checking the status of prompt files and categorizing them by state
 */
export class PromptStatusChecker {
    constructor(private fileOps: PromptFileOperations) {}

    /**
     * Check status of all prompts with comprehensive error handling
     */
    async checkPromptsStatus(configPrompts: Record<string, string>): Promise<PromptStatus[]> {
        return await this.fileOps.checkPromptsStatus(configPrompts);
    }

    /**
     * Categorize prompts by their current state
     * - Config-based: Prompts defined in configuration but not yet copied to vault
     * - Vault-based: Prompts that exist in vault
     * - Errors: Prompts with validation or access issues
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
