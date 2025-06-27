import { App, Notice, Setting } from 'obsidian';
import { PromptFileOperations } from '../prompt-file-operations';
import { DEFAULT_CONFIGS } from '@/configs';
import { PromptStatusChecker } from './PromptStatusChecker';
import { PromptCreator } from './PromptCreator';
import { IndividualPromptRenderer } from './IndividualPromptRenderer';
import { PromptStatus } from '../prompt-file-operations';

/**
 * Manages the prompts setup section with config-based and vault-based prompt states
 */
export class ExamplePromptsManager {
    private examplePrompts?: Record<string, string>;
    private importedPrompts?: Record<string, string>;
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
     * Set imported prompts (called when configuration is imported)
     */
    setImportedPrompts(prompts: Record<string, string> | undefined): void {
        this.importedPrompts = prompts;
        // Note: User will need to reload settings to see imported prompts
    }

    /**
     * Refresh the prompts display to reflect current vault state
     * This allows the view to update automatically after changes
     */
    async refreshPrompts(): Promise<void> {
        if (!this.promptsContainer || !this.examplePrompts) {
            return; // Nothing to refresh
        }

        try {
            // Clear the current prompts container
            this.promptsContainer.empty();
            
            // Re-render all prompts with their current state
            await this.renderAllPromptsAsync(this.promptsContainer);
        } catch (error) {
            console.error('Error refreshing prompts:', error);
            
            // Show error in the container
            this.promptsContainer.empty();
            this.promptsContainer.createEl('div', {
                text: `Error refreshing prompts: ${error instanceof Error ? error.message : String(error)}`,
                cls: 'setting-item-description'
            });
        }
    }

    /**
     * Render prompts setup section
     * Always renders all available prompts with their current state
     */
    render(containerEl: HTMLElement): void {
        try {
            // Store container reference for refreshing
            this.currentContainer = containerEl;
            
            const examplePrompts = this.getExamplePrompts();
            if (!examplePrompts || Object.keys(examplePrompts).length === 0) {
                return; // No prompts, nothing to render
            }

            this.examplePrompts = examplePrompts;
            
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
            console.error('Error accessing example prompts:', error);
            
            // Show error using proper Setting structure
            new Setting(containerEl).setName('Prompts').setHeading();
            new Setting(containerEl)
                .setName('Error')
                .setDesc(`Failed to load prompts: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Get example prompts, prioritizing imported prompts over default config
     * Assumes configuration is always complete and valid
     */
    private getExamplePrompts(): Record<string, string> | null {
        // First priority: imported prompts
        if (this.importedPrompts && Object.keys(this.importedPrompts).length > 0) {
            return this.importedPrompts;
        }

        // Second priority: default configuration (assumed to always be complete)
        const defaultConfig = DEFAULT_CONFIGS?.['default'];
        const examplePrompts = defaultConfig?.examplePrompts;

        return examplePrompts || null;
    }

    /**
     * Get info text about the current prompt source
     */
    private getPromptSourceInfo(): string | null {
        if (this.importedPrompts) {
            return `Using ${Object.keys(this.importedPrompts).length} prompts from configuration.`;
        }
        
        const defaultConfig = this.getExamplePrompts();
        if (defaultConfig) {
            return `Using ${Object.keys(defaultConfig).length} prompts from configuration.`;
        }
        
        return null;
    }

    /**
     * Render all prompts asynchronously using proper Setting structure
     * Always shows all prompts with their current state (config-based vs vault-based)
     */
    private async renderAllPromptsAsync(containerEl: HTMLElement): Promise<void> {
        const currentPrompts = this.getExamplePrompts();
        if (!currentPrompts) return;

        try {
            const promptsStatus = await this.statusChecker.checkPromptsStatus(currentPrompts);
            const { configBased, vaultBased, errors } = this.statusChecker.categorizePrompts(promptsStatus);

            // Render error prompts if any
            if (errors.length > 0) {
                new Setting(containerEl)
                    .setName('⚠️ Errors detected')
                    .setDesc(errors.map(p => `• ${p.path}: ${p.error}`).join('\n'));
            }
            
            // Always render config-based prompts (available to copy to vault)
            for (const prompt of configBased) {
                this.renderConfigBasedPrompt(containerEl, prompt);
            }

            // Always render vault-based prompts (customized versions in vault)
            for (const prompt of vaultBased) {
                this.renderVaultBasedPrompt(containerEl, prompt);
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
    private renderConfigBasedPrompt(containerEl: HTMLElement, prompt: any): void {
        const filename = this.getFilenameFromPath(prompt.path);
        
        new Setting(containerEl)
            .setName(`📄 ${filename}`)
            .setDesc('Using prompt from configuration. Copy to vault to customize.')
            .addButton(button => {
                button
                    .setButtonText('Copy to vault')
                    .setTooltip('Copy this prompt to your vault so you can customize it')
                    .onClick(async () => {
                        button.setDisabled(true);
                        button.setButtonText('Copying...');
                        try {
                            await this.copyPromptToVault(prompt);
                        } finally {
                            button.setDisabled(false);
                            button.setButtonText('Copy to vault');
                        }
                    });
            });
    }

    /**
     * Render a vault-based prompt using Setting structure  
     * Shows prompts that exist in the vault (potentially customized)
     */
    private renderVaultBasedPrompt(containerEl: HTMLElement, prompt: any): void {
        const filename = this.getFilenameFromPath(prompt.path);
        
        new Setting(containerEl)
            .setName(`✅ ${filename}`)
            .setDesc('Using prompt from vault. Delete the file to revert to configuration version.')
            .addButton(button => {
                button
                    .setButtonText('View in vault')
                    .setTooltip('Open this customized prompt in your vault')
                    .onClick(() => this.viewPromptInVault(prompt));
            });
    }

    /**
     * View a prompt that exists in the vault
     */
    private async viewPromptInVault(prompt: any): Promise<void> {
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
     * Copy a prompt from configuration to vault for customization
     * Enhanced with progress feedback and automatic view refresh
     */
    private async copyPromptToVault(prompt: any): Promise<void> {
        const filename = this.getFilenameFromPath(prompt.path);
        
        try {
            // Show progress feedback
            new Notice(`🔄 Copying ${filename} to vault...`);
            
            // Copy the file to vault
            await this.fileOps.createPromptFile(prompt.path, prompt.content);
            
            // Show success message with guidance
            new Notice(`✅ Copied prompt to vault: ${filename}. You can now customize it!`, 5000);
            
            // Automatically refresh the prompts display to show updated state
            await this.refreshPrompts();
            
        } catch (error) {
            const errorMsg = `Failed to copy ${filename}: ${error instanceof Error ? error.message : String(error)}`;
            new Notice(`❌ ${errorMsg}`, 5000);
            console.error(errorMsg, error);
            // Re-throw to let the button handler know about the error
            throw error;
        }
    }
}
