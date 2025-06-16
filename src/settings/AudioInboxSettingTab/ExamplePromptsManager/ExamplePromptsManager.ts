import { App } from 'obsidian';
import { PromptFileOperations } from '../prompt-file-operations';
import { DEFAULT_CONFIGS } from '@/configs';
import { PromptStatusChecker } from './PromptStatusChecker';
import { PromptCreator } from './PromptCreator';
import { StatusRenderer } from './StatusRenderer';
import { BatchActionsRenderer } from './BatchActionsRenderer';
import { IndividualPromptRenderer } from './IndividualPromptRenderer';
import { ErrorRenderer } from './ErrorRenderer';

/**
 * Manages the example prompts setup section with enhanced UI
 */
export class ExamplePromptsManager {
    private isCheckingPrompts = false;
    private promptsContainer?: HTMLElement;
    private examplePrompts?: Record<string, string>;
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
     * Render example prompts setup section with enhanced UI
     */
    render(containerEl: HTMLElement): void {
        containerEl.createEl('h3', { text: '📝 Example Prompts Setup' });
        
        this.renderDescription(containerEl);
        
        try {
            const examplePrompts = this.getExamplePrompts();
            if (!examplePrompts) return;

            this.setupPromptsContainer(containerEl);
            this.examplePrompts = examplePrompts;
            this.updatePromptsStatus();

        } catch (error) {
            console.error('Error accessing example prompts:', error);
            ErrorRenderer.showConfigError(containerEl, `Failed to load example prompts: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Render description section
     */
    private renderDescription(containerEl: HTMLElement): void {
        const descEl = containerEl.createEl('div');
        descEl.addClass('example-prompts-description');
        descEl.innerHTML = `
            <p style="margin-bottom: 10px;">
                Set up example prompt files in your vault to get started quickly. These prompts work with the default pipeline configuration.
            </p>
            <div style="padding: 10px; background-color: var(--background-secondary); border-radius: 4px; font-size: 14px; color: var(--text-muted);">
                💡 <strong>Note:</strong> Only missing files are shown. Existing prompts in your vault will not be overwritten.
            </div>
        `;
    }

    /**
     * Get and validate example prompts from config
     */
    private getExamplePrompts(): Record<string, string> | null {
        const defaultConfig = DEFAULT_CONFIGS?.['default'];
        const examplePrompts = defaultConfig?.examplePrompts;

        if (!defaultConfig) {
            ErrorRenderer.showConfigError(document.body, 'Default configuration not found in bundled configs');
            return null;
        }

        if (!examplePrompts || typeof examplePrompts !== 'object') {
            ErrorRenderer.showConfigError(document.body, 'Example prompts not found in default configuration');
            return null;
        }

        if (Object.keys(examplePrompts).length === 0) {
            ErrorRenderer.showNoPromptsWarning(document.body);
            return null;
        }

        return examplePrompts;
    }

    /**
     * Setup the main container for prompts
     */
    private setupPromptsContainer(containerEl: HTMLElement): void {
        this.promptsContainer = containerEl.createEl('div');
        this.promptsContainer.addClass('example-prompts-container');
    }

    /**
     * Update the prompts status display
     */
    private async updatePromptsStatus(): Promise<void> {
        if (!this.promptsContainer || !this.examplePrompts || this.isCheckingPrompts) {
            return;
        }

        this.isCheckingPrompts = true;

        try {
            StatusRenderer.renderLoadingState(this.promptsContainer);
            
            const promptsStatus = await this.statusChecker.checkPromptsStatus(this.examplePrompts);
            const { missing, existing, errors } = this.statusChecker.categorizePrompts(promptsStatus);

            this.promptsContainer.empty();

            StatusRenderer.renderStatusSummary(this.promptsContainer, missing, existing, errors);
            ErrorRenderer.renderErrorPrompts(this.promptsContainer, errors);
            
            if (missing.length === 0 && errors.length === 0) {
                this.renderAllExistState(existing);
            } else if (missing.length > 0) {
                this.renderMissingPrompts(missing);
            }

        } catch (error) {
            ErrorRenderer.handleOverallError(this.promptsContainer, error);
        } finally {
            this.isCheckingPrompts = false;
        }
    }

    /**
     * Render state when all prompts exist
     */
    private renderAllExistState(existingPrompts: any[]): void {
        if (!this.promptsContainer) return;
        StatusRenderer.renderAllExistState(this.promptsContainer, existingPrompts, () => this.updatePromptsStatus());
    }

    /**
     * Render missing prompts section
     */
    private renderMissingPrompts(missingPrompts: any[]): void {
        if (!this.promptsContainer) return;
        
        BatchActionsRenderer.renderBatchActions(
            this.promptsContainer, 
            missingPrompts, 
            () => this.createAllMissingPrompts(missingPrompts),
            () => this.updatePromptsStatus()
        );
        
        this.individualRenderer.renderIndividualPrompts(
            this.promptsContainer, 
            missingPrompts, 
            (prompt) => this.createSinglePrompt(prompt)
        );
    }

    /**
     * Create all missing prompts
     */
    private async createAllMissingPrompts(missingPrompts: any[]): Promise<void> {
        await this.promptCreator.createAllMissingPrompts(missingPrompts);
        await this.updatePromptsStatus();
    }

    /**
     * Create a single prompt
     */
    private async createSinglePrompt(prompt: any): Promise<void> {
        await this.promptCreator.createSinglePrompt(prompt);
        await this.updatePromptsStatus();
    }
}
