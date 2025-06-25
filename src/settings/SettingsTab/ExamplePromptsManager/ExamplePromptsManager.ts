import { App, Setting } from 'obsidian';
import { PromptFileOperations } from '../prompt-file-operations';
import { DEFAULT_CONFIGS } from '@/configs';
import { PromptStatusChecker } from './PromptStatusChecker';
import { PromptCreator } from './PromptCreator';
import { IndividualPromptRenderer } from './IndividualPromptRenderer';
import { PromptStatus } from '../prompt-file-operations';

/**
 * Manages the simplified prompts setup section with support for imported example prompts
 */
export class ExamplePromptsManager {
    private examplePrompts?: Record<string, string>;
    private importedPrompts?: Record<string, string>;
    private fileOps: PromptFileOperations;
    private statusChecker: PromptStatusChecker;
    private promptCreator: PromptCreator;
    private individualRenderer: IndividualPromptRenderer;
    private promptsContainer?: HTMLElement;

    constructor(private app: App) {
        this.fileOps = new PromptFileOperations(app);
        this.statusChecker = new PromptStatusChecker(this.fileOps);
        this.promptCreator = new PromptCreator(this.fileOps);
        this.individualRenderer = new IndividualPromptRenderer(this.fileOps);
    }

    /**
     * Set imported example prompts (called when configuration is imported)
     */
    setImportedPrompts(prompts: Record<string, string> | undefined): void {
        this.importedPrompts = prompts;
        // Re-render if we have a container
        if (this.promptsContainer) {
            this.updatePromptsStatus();
        }
    }

    /**
     * Clear imported prompts (called when default configuration is loaded)
     */
    clearImportedPrompts(): void {
        this.importedPrompts = undefined;
        // Re-render if we have a container
        if (this.promptsContainer) {
            this.updatePromptsStatus();
        }
    }

    /**
     * Render simplified prompts setup section synchronously
     * Creates a placeholder container that will be populated async
     */
    render(containerEl: HTMLElement): void {
        try {
            const examplePrompts = this.getExamplePrompts();
            if (!examplePrompts) return;

            this.examplePrompts = examplePrompts;
            
            // Create a container immediately to reserve the position
            this.promptsContainer = containerEl.createEl('div', { cls: 'content-pipeline-prompts-container' });
            
            // Populate the container asynchronously but in the correct position
            this.updatePromptsStatus();

        } catch (error) {
            console.error('Error accessing example prompts:', error);
            // Create a container for error display
            this.promptsContainer = containerEl.createEl('div', { cls: 'content-pipeline-prompts-container' });
            this.showSimpleError(this.promptsContainer, `Failed to load example prompts: ${error instanceof Error ? error.message : String(error)}`);
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
     * Update the prompts status display in the reserved container
     */
    private async updatePromptsStatus(): Promise<void> {
        // Get the current prompts (imported or default)
        const currentPrompts = this.getExamplePrompts();
        if (!currentPrompts || !this.promptsContainer) {
            return;
        }

        try {
            const promptsStatus = await this.statusChecker.checkPromptsStatus(currentPrompts);
            const { configBased, vaultBased, errors } = this.statusChecker.categorizePrompts(promptsStatus);

            // Clear the container
            this.promptsContainer.empty();

            // Always show the section if we have prompts
            if (Object.keys(currentPrompts).length > 0) {
                // Create the heading using proper Obsidian heading method
                new Setting(this.promptsContainer).setName('Prompts').setHeading();
                
                // Create a content section within the container
                const contentSection = this.promptsContainer.createEl('div');

                // Show info about the current prompt source
                const sourceInfo = this.getPromptSourceInfo();
                if (sourceInfo) {
                    const infoEl = contentSection.createEl('p', { cls: 'content-pipeline-prompts-info' });
                    infoEl.textContent = sourceInfo;
                }

                // Render error prompts if any
                this.renderErrorPrompts(contentSection, errors);
                
                // Render config-based prompts (not in vault)
                if (configBased.length > 0) {
                    this.renderConfigBasedPrompts(contentSection, configBased);
                }

                // Render vault-based prompts (exist in vault)
                if (vaultBased.length > 0) {
                    this.renderVaultBasedPrompts(contentSection, vaultBased);
                }
            } else {
                // If no prompts to show, hide the container completely
                this.promptsContainer.addClass('content-pipeline-prompts-hidden');
            }

        } catch (error) {
            // If there's an error checking status, show error in the container
            this.promptsContainer.empty();
            new Setting(this.promptsContainer).setName('Prompts').setHeading();
            this.handleOverallError(this.promptsContainer, error);
        }
    }

    /**
     * Get info text about the current prompt source
     */
    private getPromptSourceInfo(): string | null {
        if (this.importedPrompts) {
            return `Using ${Object.keys(this.importedPrompts).length} prompts from imported configuration.`;
        }
        
        const defaultConfig = this.getExamplePrompts();
        if (defaultConfig) {
            return `Using ${Object.keys(defaultConfig).length} prompts from configuration.`;
        }
        
        return null;
    }

    /**
     * Render config-based prompts (not in vault yet)
     */
    private renderConfigBasedPrompts(contentEl: HTMLElement, configBasedPrompts: any[]): void {
        this.individualRenderer.renderConfigBasedPrompts(
            contentEl, 
            configBasedPrompts, 
            (prompt) => this.movePromptToVault(prompt)
        );
    }

    /**
     * Render vault-based prompts (exist in vault)
     */
    private renderVaultBasedPrompts(contentEl: HTMLElement, vaultBasedPrompts: any[]): void {
        this.individualRenderer.renderVaultBasedPrompts(
            contentEl, 
            vaultBasedPrompts, 
            (prompt) => this.viewPromptInVault(prompt)
        );
    }

    /**
     * Move a prompt from config to vault (replaces createSinglePrompt)
     */
    private async movePromptToVault(prompt: any): Promise<void> {
        await this.promptCreator.movePromptToVault(prompt);
        // Re-render the status in the same container
        this.updatePromptsStatus();
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
     * Simplified error display for basic errors
     */
    private showSimpleError(containerEl: HTMLElement, message: string): void {
        const errorEl = containerEl.createEl('div', { cls: 'content-pipeline-simple-error' });
        errorEl.innerHTML = `❌ <strong>Error:</strong> ${message}`;
    }

    /**
     * Render error prompts section (inlined from ErrorRenderer)
     */
    private renderErrorPrompts(containerEl: HTMLElement, errorPrompts: PromptStatus[]): void {
        if (errorPrompts.length === 0) return;

        const errorEl = containerEl.createEl('div', { cls: 'content-pipeline-error-with-details' });
        errorEl.innerHTML = `
            <strong>⚠️ Errors detected:</strong><br>
            ${errorPrompts.map(p => `• <code>${p.path}</code>: ${p.error}`).join('<br>')}
        `;
    }

    /**
     * Handle overall errors (inlined from ErrorRenderer)
     */
    private handleOverallError(containerEl: HTMLElement, error: unknown): void {
        containerEl.empty();
        const errorEl = containerEl.createEl('div', { cls: 'content-pipeline-overall-error' });
        errorEl.innerHTML = `
            <div class="content-pipeline-overall-error-icon">⚠️</div>
            <div class="content-pipeline-overall-error-title">Error Checking Prompts</div>
            <div class="content-pipeline-overall-error-details">${error instanceof Error ? error.message : String(error)}</div>
        `;
        
        console.error('Error in updatePromptsStatus:', error);
    }
}
