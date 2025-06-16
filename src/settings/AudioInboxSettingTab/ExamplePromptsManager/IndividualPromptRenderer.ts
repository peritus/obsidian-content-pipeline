import { PromptStatus, PromptFileOperations } from '../prompt-file-operations';
import { UIHelpers } from './UIHelpers';

/**
 * Handles rendering individual prompt entries
 */
export class IndividualPromptRenderer {
    constructor(private fileOps: PromptFileOperations) {}

    /**
     * Render individual missing prompts section
     */
    renderIndividualPrompts(containerEl: HTMLElement, missingPrompts: PromptStatus[], onCreateSingle: (prompt: PromptStatus) => void): void {
        const promptsListLabel = containerEl.createEl('div');
        promptsListLabel.style.cssText = `
            font-weight: bold; 
            margin-bottom: 15px; 
            color: var(--text-normal);
            font-size: 16px;
        `;
        promptsListLabel.textContent = '📋 Missing Prompts';

        for (const prompt of missingPrompts) {
            this.renderIndividualPrompt(containerEl, prompt, onCreateSingle);
        }
    }

    /**
     * Render a single individual prompt entry
     */
    private renderIndividualPrompt(containerEl: HTMLElement, prompt: PromptStatus, onCreate: (prompt: PromptStatus) => void): void {
        const promptEl = containerEl.createEl('div');
        promptEl.style.cssText = UIHelpers.getStyles().promptCard;

        this.renderPromptHeader(promptEl, prompt);
        this.renderPromptContent(promptEl, prompt, onCreate);
    }

    /**
     * Render prompt header with file path and status
     */
    private renderPromptHeader(promptEl: HTMLElement, prompt: PromptStatus): void {
        const headerEl = promptEl.createEl('div');
        headerEl.addClass('example-prompts-card-header');

        const pathEl = headerEl.createEl('div');
        pathEl.style.cssText = `
            font-weight: bold;
            color: var(--text-accent);
            font-family: var(--font-monospace);
            font-size: 14px;
        `;
        pathEl.textContent = prompt.path;

        const statusBadge = headerEl.createEl('span');
        statusBadge.addClass('example-prompts-status-badge');
        statusBadge.textContent = 'MISSING';
    }

    /**
     * Render prompt content preview and actions
     */
    private renderPromptContent(promptEl: HTMLElement, prompt: PromptStatus, onCreate: (prompt: PromptStatus) => void): void {
        const contentEl = promptEl.createEl('div');
        contentEl.style.cssText = 'padding: 15px;';

        this.renderContentPreview(contentEl, prompt);
        this.renderActions(contentEl, prompt, onCreate);
    }

    /**
     * Render content preview section
     */
    private renderContentPreview(contentEl: HTMLElement, prompt: PromptStatus): void {
        const previewLabel = contentEl.createEl('div');
        previewLabel.style.cssText = `
            font-size: 13px;
            color: var(--text-muted);
            margin-bottom: 8px;
            font-weight: 500;
        `;
        previewLabel.textContent = '📄 Content Preview:';
        
        const previewEl = contentEl.createEl('div');
        previewEl.addClass('example-prompts-content-preview');
        previewEl.textContent = this.fileOps.getContentPreview(prompt.content);
    }

    /**
     * Render action buttons and metadata
     */
    private renderActions(contentEl: HTMLElement, prompt: PromptStatus, onCreate: (prompt: PromptStatus) => void): void {
        const actionsEl = contentEl.createEl('div');
        actionsEl.addClass('example-prompts-actions');

        this.renderCreateButton(actionsEl, prompt, onCreate);
        this.renderMetaInfo(actionsEl, prompt);
    }

    /**
     * Render create button for individual prompt
     */
    private renderCreateButton(actionsEl: HTMLElement, prompt: PromptStatus, onCreate: (prompt: PromptStatus) => void): void {
        const createBtn = actionsEl.createEl('button', { 
            text: `Create example prompt: ${prompt.path}` 
        });
        createBtn.style.cssText = `
            ${UIHelpers.getStyles().primaryButton}
            flex: 1;
            min-width: 200px;
        `;
        createBtn.onclick = () => onCreate(prompt);
    }

    /**
     * Render metadata information for prompt
     */
    private renderMetaInfo(actionsEl: HTMLElement, prompt: PromptStatus): void {
        const metaInfo = actionsEl.createEl('div');
        metaInfo.addClass('example-prompts-meta-info');
        
        const sizeInfo = metaInfo.createEl('span');
        sizeInfo.textContent = `${prompt.content.length} characters`;
        
        const linesInfo = metaInfo.createEl('span');
        linesInfo.textContent = `${prompt.content.split('\n').length} lines`;
    }
}
