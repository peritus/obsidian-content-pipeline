import { PromptStatus, PromptFileOperations } from '../prompt-file-operations';

/**
 * Handles rendering individual prompt entries with different states and actions
 */
export class IndividualPromptRenderer {
    constructor(private fileOps: PromptFileOperations) {}

    /**
     * Render config-based prompts (not in vault yet)
     */
    renderConfigPrompts(containerEl: HTMLElement, configPrompts: PromptStatus[], onCopyToVault: (prompt: PromptStatus) => void): void {
        // Sort prompts by filename (path)
        const sortedPrompts = [...configPrompts].sort((a, b) => a.path.localeCompare(b.path));

        for (const prompt of sortedPrompts) {
            this.renderConfigPrompt(containerEl, prompt, onCopyToVault);
        }
    }

    /**
     * Render vault-based prompts (exist in vault)
     */
    renderVaultPrompts(containerEl: HTMLElement, vaultPrompts: PromptStatus[], onOpenInVault: (prompt: PromptStatus) => void): void {
        // Sort prompts by filename (path)
        const sortedPrompts = [...vaultPrompts].sort((a, b) => a.path.localeCompare(b.path));

        for (const prompt of sortedPrompts) {
            this.renderVaultPrompt(containerEl, prompt, onOpenInVault);
        }
    }

    /**
     * Render a config-based prompt entry (using prompt from configuration)
     */
    private renderConfigPrompt(containerEl: HTMLElement, prompt: PromptStatus, onCopyToVault: (prompt: PromptStatus) => void): void {
        const promptEl = containerEl.createEl('div', { cls: 'content-pipeline-prompt-item' });

        // Top row: filename and button
        const topRow = promptEl.createEl('div', { cls: 'content-pipeline-prompt-top-row' });

        // Left side: filename (ensure path starts with /)
        const filenameEl = topRow.createEl('div', { cls: 'content-pipeline-prompt-filename' });
        const displayPath = prompt.path.startsWith('/') ? prompt.path : `/${prompt.path}`;
        filenameEl.textContent = displayPath;

        // Right side: button
        const copyBtn = topRow.createEl('button', {
            text: 'Copy to vault',
            cls: 'content-pipeline-prompt-create-button'
        });
        copyBtn.onclick = () => onCopyToVault(prompt);

        // Bottom row: status and help text
        const finePrintEl = promptEl.createEl('small', { cls: 'content-pipeline-prompt-fine-print' });
        finePrintEl.textContent = 'Prompt from configuration. Copy to vault to edit.';
    }

    /**
     * Render a vault-based prompt entry (using prompt from vault)
     */
    private renderVaultPrompt(containerEl: HTMLElement, prompt: PromptStatus, onOpenInVault: (prompt: PromptStatus) => void): void {
        const promptEl = containerEl.createEl('div', { cls: 'content-pipeline-prompt-item content-pipeline-prompt-vault-based' });

        // Top row: filename and button
        const topRow = promptEl.createEl('div', { cls: 'content-pipeline-prompt-top-row' });

        // Left side: filename (ensure path starts with /)
        const filenameEl = topRow.createEl('div', { cls: 'content-pipeline-prompt-filename' });
        const displayPath = prompt.path.startsWith('/') ? prompt.path : `/${prompt.path}`;
        filenameEl.textContent = displayPath;

        // Right side: button
        const openBtn = topRow.createEl('button', {
            text: 'Open in vault',
            cls: 'content-pipeline-prompt-view-button'
        });
        openBtn.onclick = () => onOpenInVault(prompt);

        // Bottom row: status and help text
        const finePrintEl = promptEl.createEl('small', { cls: 'content-pipeline-prompt-fine-print' });
        finePrintEl.textContent = 'Prompt stored in vault. Delete file to use configuration version.';
    }
}
