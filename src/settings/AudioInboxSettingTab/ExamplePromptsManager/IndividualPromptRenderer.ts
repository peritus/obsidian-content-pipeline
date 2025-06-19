import { PromptStatus, PromptFileOperations } from '../prompt-file-operations';

/**
 * Handles rendering simplified individual prompt entries with horizontal layout
 */
export class IndividualPromptRenderer {
    constructor(private fileOps: PromptFileOperations) {}

    /**
     * Render individual missing prompts section
     */
    renderIndividualPrompts(containerEl: HTMLElement, missingPrompts: PromptStatus[], onCreateSingle: (prompt: PromptStatus) => void): void {
        for (const prompt of missingPrompts) {
            this.renderIndividualPrompt(containerEl, prompt, onCreateSingle);
        }
    }

    /**
     * Render a single simplified prompt entry with horizontal layout and static fine print
     */
    private renderIndividualPrompt(containerEl: HTMLElement, prompt: PromptStatus, onCreate: (prompt: PromptStatus) => void): void {
        const promptEl = containerEl.createEl('div', { cls: 'audio-inbox-prompt-item' });

        // Top row: filename and button
        const topRow = promptEl.createEl('div', { cls: 'audio-inbox-prompt-top-row' });

        // Left side: filename
        const filenameEl = topRow.createEl('div', { cls: 'audio-inbox-prompt-filename' });
        filenameEl.textContent = prompt.path;

        // Right side: button
        const createBtn = topRow.createEl('button', { 
            text: 'Create example',
            cls: 'audio-inbox-prompt-create-button'
        });
        createBtn.onclick = () => onCreate(prompt);

        // Bottom row: static fine print without filename duplication
        const finePrintEl = promptEl.createEl('small', { cls: 'audio-inbox-prompt-fine-print' });
        finePrintEl.textContent = 'Prompt file not found';
    }
}
