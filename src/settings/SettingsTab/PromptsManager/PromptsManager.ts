import { App, Notice, Setting } from 'obsidian';
import { PromptFileOperations } from '../prompt-file-operations';
import { PromptStatusChecker } from './PromptStatusChecker';
import { PromptCreator } from './PromptCreator';
import { IndividualPromptRenderer } from './IndividualPromptRenderer';

interface PromptInfo {
    path: string;
    content: string;
    error?: string;
}

/**
 * Manages the prompts setup section with config-based and vault-based prompt states
 */
export class PromptsManager {
    private configPrompts?: Record<string, string>;
    private configDefinedPrompts?: Record<string, string>;
    private fileOps: PromptFileOperations;
    private statusChecker: PromptStatusChecker;
    private promptCreator: PromptCreator;
    private individualRenderer: IndividualPromptRenderer;
    private currentContainer?: HTMLElement;
    private promptsContainer?: HTMLElement;

    constructor(private app: App) {
        this.fileOps = new PromptFileOperations(app);
        this.statusChecker = new PromptStatusChecker(this.fileOps);
        this.promptCreator = new PromptCreator(this.fileOps);
        this.individualRenderer = new IndividualPromptRenderer(this.fileOps);
    }

    /**
     * Set config-defined prompts (called when configuration is imported)
     */
    setConfigDefinedPrompts(prompts: Record<string, string> | undefined): void {
        this.configDefinedPrompts = prompts;
        // Note: User will need to reload settings to see config-defined prompts
    }

    /**
     * Refresh the prompts display to reflect current vault state
     * Simplified to just re-render the prompts with consistent ordering
     */
    async refreshPrompts(): Promise<void> {
        if (!this.promptsContainer || !this.configPrompts) {
            return; // Nothing to refresh
        }

        // Clear and re-render - with consistent sorting, this is smooth
        this.promptsContainer.empty();
        await this.renderAllPromptsAsync(this.promptsContainer);
    }

    /**
     * Render prompts setup section
     * Always renders all available prompts with their current state
     */
    render(containerEl: HTMLElement): void {
        try {
            // Store container reference for refreshing
            this.currentContainer = containerEl;

            const configPrompts = this.getConfigPrompts();
            if (!configPrompts || Object.keys(configPrompts).length === 0) {
                return; // No prompts, nothing to render
            }

            this.configPrompts = configPrompts;

            // Create proper Obsidian heading
            new Setting(containerEl).setName('Prompts').setHeading();

            // Add description using Setting
            const sourceInfo = this.getPromptSourceInfo();
            if (sourceInfo) {
                new Setting(containerEl)
                    .setName('')
                    .setDesc(sourceInfo);
            }

            // Create a dedicated container for prompts that can be refreshed
            this.promptsContainer = containerEl.createDiv('prompts-list-container');

            // Render all prompts asynchronously
            this.renderAllPromptsAsync(this.promptsContainer);

        } catch (error) {
            console.error('Error accessing prompts:', error);

            // Show error using proper Setting structure
            new Setting(containerEl).setName('Prompts').setHeading();
            new Setting(containerEl)
                .setName('Error')
                .setDesc(`Failed to load prompts: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Get config prompts, prioritizing loaded prompts over available configs
     * Since there's no explicit "default" config anymore, we don't fall back to any config
     */
    private getConfigPrompts(): Record<string, string> | null {
        // First priority: config-defined prompts (includes prompts from loaded configs)
        if (this.configDefinedPrompts && Object.keys(this.configDefinedPrompts).length > 0) {
            return this.configDefinedPrompts;
        }

        // No fallback to default config since users must manually load a config
        return null;
    }

    /**
     * Get info text about the current prompt source
     */
    private getPromptSourceInfo(): string | null {
        if (this.configDefinedPrompts) {
            return `Pipeline configuration defines ${Object.keys(this.configDefinedPrompts).length} prompts:`;
        }

        // No prompts available - user needs to load a configuration
        return null;
    }

    /**
     * Render all prompts asynchronously using proper Setting structure
     * Always shows all prompts with their current state (config-based vs vault-based)
     */
    private async renderAllPromptsAsync(containerEl: HTMLElement): Promise<void> {
        const currentPrompts = this.getConfigPrompts();
        if (!currentPrompts) return;

        try {
            const promptsStatus = await this.statusChecker.checkPromptsStatus(currentPrompts);
            const { configBased, vaultBased, errors } = this.statusChecker.categorizePrompts(promptsStatus);

            // Sort prompts by path to ensure consistent order and prevent flickering
            const sortedConfigBased = configBased.sort((a, b) => a.path.localeCompare(b.path));
            const sortedVaultBased = vaultBased.sort((a, b) => a.path.localeCompare(b.path));
            const sortedErrors = errors.sort((a, b) => a.path.localeCompare(b.path));

            // Render error prompts if any
            if (sortedErrors.length > 0) {
                new Setting(containerEl)
                    .setName('⚠️ Errors detected')
                    .setDesc(sortedErrors.map(p => `• ${p.path}: ${p.error}`).join('\n'));
            }

            // Always render config-based prompts (available to copy to vault)
            for (const prompt of sortedConfigBased) {
                this.renderConfigPrompt(containerEl, prompt);
            }

            // Always render vault-based prompts (versions in vault)
            for (const prompt of sortedVaultBased) {
                this.renderVaultPrompt(containerEl, prompt);
            }

        } catch (error) {
            new Setting(containerEl)
                .setName('Error checking prompts')
                .setDesc(`${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Extract filename from a file path
     */
    private getFilenameFromPath(path: string): string {
        if (!path) return 'Unknown file';

        // Split by both forward and backward slashes and get the last part
        const parts = path.split(/[/\\]/);
        return parts[parts.length - 1] || 'Unknown file';
    }

    /**
     * Render a config-based prompt using Setting structure
     * Shows prompts that are defined in configuration but not yet copied to vault
     */
    private renderConfigPrompt(containerEl: HTMLElement, prompt: PromptInfo): void {
        const filename = this.getFilenameFromPath(prompt.path);

        new Setting(containerEl)
            .setName(`⚙️ ${filename}`)
            .setDesc('Prompt from configuration. Copy to vault to edit.')
            .addButton(button => {
                button
                    .setButtonText('Copy to vault')
                    .setTooltip('Copy this prompt to your vault so you can edit it')
                    .onClick(() => this.copyToVault(prompt));
            });
    }

    /**
     * Render a vault-based prompt using Setting structure
     * Shows prompts that exist in the vault
     */
    private renderVaultPrompt(containerEl: HTMLElement, prompt: PromptInfo): void {
        const filename = this.getFilenameFromPath(prompt.path);

        new Setting(containerEl)
            .setName(`📝 ${filename}`)
            .setDesc('Prompt stored in vault. Delete file to use configuration version.')
            .addButton(button => {
                button
                    .setButtonText('Open in vault')
                    .setTooltip('Open this prompt in your vault')
                    .onClick(() => this.openInVault(prompt));
            });
    }

    /**
     * Open a prompt that exists in the vault
     */
    private async openInVault(prompt: PromptInfo): Promise<void> {
        try {
            // Open the file in Obsidian
            const file = this.app.vault.getAbstractFileByPath(prompt.path);
            if (file) {
                await this.app.workspace.openLinkText(prompt.path, '', false);
            } else {
                console.error(`File not found: ${prompt.path}`);
            }
        } catch (error) {
            console.error(`Failed to open prompt file ${prompt.path}:`, error);
        }
    }

    /**
     * Copy a prompt from configuration to vault for editing
     * Enhanced with progress feedback and automatic view refresh
     */
    private async copyToVault(prompt: PromptInfo): Promise<void> {
        const filename = this.getFilenameFromPath(prompt.path);

        try {
            // Show progress feedback
            new Notice(`🔄 Copying ${filename} to vault...`);

            // Copy the file to vault
            await this.fileOps.createPromptFile(prompt.path, prompt.content);

            // Show success message with guidance
            new Notice(`✅ Copied prompt to vault: ${filename}. You can now edit it!`, 5000);

            // Automatically refresh the prompts display to show updated state
            await this.refreshPrompts();

        } catch (error) {
            const errorMsg = `Failed to copy ${filename}: ${error instanceof Error ? error.message : String(error)}`;
            new Notice(`❌ ${errorMsg}`, 5000);
            console.error(errorMsg, error);
        }
    }
}
