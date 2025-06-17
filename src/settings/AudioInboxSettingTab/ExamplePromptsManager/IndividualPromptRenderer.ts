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
        const promptEl = containerEl.createEl('div');
        promptEl.style.cssText = `
            margin-bottom: 15px;
            padding: 15px;
            background-color: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 6px;
            font-size: 14px;
        `;

        // Top row: filename and button
        const topRow = promptEl.createEl('div');
        topRow.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 15px;
            margin-bottom: 8px;
        `;

        // Left side: filename
        const filenameEl = topRow.createEl('div');
        filenameEl.style.cssText = `
            font-weight: 500;
            color: var(--text-normal);
            font-family: var(--font-monospace);
            font-size: 14px;
            flex: 1;
            min-width: 0;
            word-break: break-all;
        `;
        filenameEl.textContent = prompt.path;

        // Right side: button
        const createBtn = topRow.createEl('button', { 
            text: 'Create example' 
        });
        createBtn.style.cssText = `
            background: var(--interactive-accent);
            color: var(--text-on-accent);
            border: none;
            border-radius: 4px;
            padding: 8px 16px;
            cursor: pointer;
            font-weight: 500;
            font-size: 13px;
            white-space: nowrap;
            flex-shrink: 0;
        `;
        createBtn.onmouseover = () => {
            createBtn.style.opacity = '0.9';
        };
        createBtn.onmouseout = () => {
            createBtn.style.opacity = '1';
        };
        createBtn.onclick = () => onCreate(prompt);

        // Bottom row: static fine print without filename duplication
        const finePrintEl = promptEl.createEl('small');
        finePrintEl.style.cssText = `
            font-size: 12px;
            color: var(--text-muted);
            line-height: 1.4;
        `;
        finePrintEl.textContent = 'Prompt file not found';
    }
}