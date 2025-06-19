import { App } from 'obsidian';
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
            this.promptsContainer = containerEl.createEl('div', { cls: 'audio-inbox-prompts-container' });
            
            // Populate the container asynchronously but in the correct position
            this.updatePromptsStatus();

        } catch (error) {
            console.error('Error accessing example prompts:', error);
            // Create a container for error display
            this.promptsContainer = containerEl.createEl('div', { cls: 'audio-inbox-prompts-container' });
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
            const { missing, errors } = this.statusChecker.categorizePrompts(promptsStatus);

            // Clear the container
            this.promptsContainer.empty();

            // Only populate the container if there are missing prompts or errors
            if (missing.length > 0 || errors.length > 0) {
                // Create the heading with indicator if using imported prompts
                const headingText = this.importedPrompts ? 'Prompts (imported)' : 'Prompts';
                this.promptsContainer.createEl('h3', { text: headingText });
                
                // Create a content section within the container
                const contentSection = this.promptsContainer.createEl('div');

                // Show info about imported prompts if applicable
                if (this.importedPrompts) {
                    const infoEl = contentSection.createEl('p', { cls: 'audio-inbox-prompts-info' });
                    infoEl.textContent = `Using ${Object.keys(this.importedPrompts).length} example prompts from imported configuration.`;
                }

                // Render error prompts if any
                this.renderErrorPrompts(contentSection, errors);
                
                // Render missing prompts if any
                if (missing.length > 0) {
                    this.renderMissingPrompts(contentSection, missing);
                }
            } else {
                // If no prompts to show, hide the container completely
                this.promptsContainer.addClass('audio-inbox-prompts-hidden');
            }

        } catch (error) {
            // If there's an error checking status, show error in the container
            this.promptsContainer.empty();
            const headingText = this.importedPrompts ? 'Prompts (imported)' : 'Prompts';
            this.promptsContainer.createEl('h3', { text: headingText });
            this.handleOverallError(this.promptsContainer, error);
        }
    }

    /**
     * Render missing prompts section
     */
    private renderMissingPrompts(contentEl: HTMLElement, missingPrompts: any[]): void {
        this.individualRenderer.renderIndividualPrompts(
            contentEl, 
            missingPrompts, 
            (prompt) => this.createSinglePrompt(prompt)
        );
    }

    /**
     * Create a single prompt
     */
    private async createSinglePrompt(prompt: any): Promise<void> {
        await this.promptCreator.createSinglePrompt(prompt);
        // Re-render the status in the same container
        this.updatePromptsStatus();
    }

    /**
     * Simplified error display for basic errors
     */
    private showSimpleError(containerEl: HTMLElement, message: string): void {
        const errorEl = containerEl.createEl('div', { cls: 'audio-inbox-simple-error' });
        errorEl.innerHTML = `❌ <strong>Error:</strong> ${message}`;
    }

    /**
     * Render error prompts section (inlined from ErrorRenderer)
     */
    private renderErrorPrompts(containerEl: HTMLElement, errorPrompts: PromptStatus[]): void {
        if (errorPrompts.length === 0) return;

        const errorEl = containerEl.createEl('div', { cls: 'audio-inbox-error-with-details' });
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
        const errorEl = containerEl.createEl('div', { cls: 'audio-inbox-overall-error' });
        errorEl.innerHTML = `
            <div class="audio-inbox-overall-error-icon">⚠️</div>
            <div class="audio-inbox-overall-error-title">Error Checking Prompts</div>
            <div class="audio-inbox-overall-error-details">${error instanceof Error ? error.message : String(error)}</div>
        `;
        
        console.error('Error in updatePromptsStatus:', error);
    }
}
