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
        // Note: User will need to reload settings to see imported prompts
    }

    /**
     * Render simplified prompts setup section
     * Only renders if there are prompts to show
     */
    render(containerEl: HTMLElement): void {
        try {
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
            
            // Render prompts asynchronously
            this.renderPromptsAsync(containerEl);

        } catch (error) {
            console.error('Error accessing example prompts:', error);
            
            // Show error using proper Setting structure
            new Setting(containerEl).setName('Prompts').setHeading();
            new Setting(containerEl)
                .setName('Error')
                .setDesc(`Failed to load example prompts: ${error instanceof Error ? error.message : String(error)}`);
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
            return `Using ${Object.keys(this.importedPrompts).length} prompts from imported configuration.`;
        }
        
        const defaultConfig = this.getExamplePrompts();
        if (defaultConfig) {
            return `Using ${Object.keys(defaultConfig).length} prompts from configuration.`;
        }
        
        return null;
    }

    /**
     * Render prompts asynchronously using proper Setting structure
     */
    private async renderPromptsAsync(containerEl: HTMLElement): Promise<void> {
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
            
            // Render config-based prompts (not in vault)
            for (const prompt of configBased) {
                this.renderConfigBasedPrompt(containerEl, prompt);
            }

            // Render vault-based prompts (exist in vault)
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
     * Render a single config-based prompt using Setting structure
     */
    private renderConfigBasedPrompt(containerEl: HTMLElement, prompt: any): void {
        new Setting(containerEl)
            .setName(`📄 ${prompt.filename}`)
            .setDesc(`Create this prompt file in your vault`)
            .addButton(button => {
                button
                    .setButtonText('Create prompt')
                    .onClick(() => this.movePromptToVault(prompt));
            });
    }

    /**
     * Render a single vault-based prompt using Setting structure
     */
    private renderVaultBasedPrompt(containerEl: HTMLElement, prompt: any): void {
        new Setting(containerEl)
            .setName(`✅ ${prompt.filename}`)
            .setDesc(`Already exists in vault`)
            .addButton(button => {
                button
                    .setButtonText('View prompt')
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
}
