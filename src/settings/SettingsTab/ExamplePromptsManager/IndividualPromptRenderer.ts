import { PromptStatus, PromptFileOperations } from '../prompt-file-operations';

/**
 * Handles rendering individual prompt entries with different states and actions
 */
export class IndividualPromptRenderer {
    constructor(private fileOps: PromptFileOperations) {}

    /**
     * Render config-based prompts (not in vault yet)
     */
    renderConfigBasedPrompts(containerEl: HTMLElement, configBasedPrompts: PromptStatus[], onMoveToVault: (prompt: PromptStatus) => void): void {
        // Sort prompts by filename (path)
        const sortedPrompts = [...configBasedPrompts].sort((a, b) => a.path.localeCompare(b.path));
        
        for (const prompt of sortedPrompts) {
            this.renderConfigBasedPrompt(containerEl, prompt, onMoveToVault);
        }
    }

    /**
     * Render vault-based prompts (exist in vault)
     */
    renderVaultBasedPrompts(containerEl: HTMLElement, vaultBasedPrompts: PromptStatus[], onViewInVault: (prompt: PromptStatus) => void): void {
        // Sort prompts by filename (path)
        const sortedPrompts = [...vaultBasedPrompts].sort((a, b) => a.path.localeCompare(b.path));
        
        for (const prompt of sortedPrompts) {
            this.renderVaultBasedPrompt(containerEl, prompt, onViewInVault);
        }
    }

    /**
     * Render individual missing prompts section (legacy method for compatibility)
     */
    renderIndividualPrompts(containerEl: HTMLElement, missingPrompts: PromptStatus[], onCreateSingle: (prompt: PromptStatus) => void): void {
        // This method is kept for compatibility but now delegates to the config-based rendering
        // Sort prompts by filename for consistency
        const sortedPrompts = [...missingPrompts].sort((a, b) => a.path.localeCompare(b.path));
        this.renderConfigBasedPrompts(containerEl, sortedPrompts, onCreateSingle);
    }

    /**
     * Render a config-based prompt entry (using prompt from configuration)
     */
    private renderConfigBasedPrompt(containerEl: HTMLElement, prompt: PromptStatus, onMoveToVault: (prompt: PromptStatus) => void): void {
        const promptEl = containerEl.createEl('div', { cls: 'content-pipeline-prompt-item' });

        // Top row: filename and button
        const topRow = promptEl.createEl('div', { cls: 'content-pipeline-prompt-top-row' });

        // Left side: filename (ensure path starts with /)
        const filenameEl = topRow.createEl('div', { cls: 'content-pipeline-prompt-filename' });
        const displayPath = prompt.path.startsWith('/') ? prompt.path : `/${prompt.path}`;
        filenameEl.textContent = displayPath;

        // Right side: button
        const moveBtn = topRow.createEl('button', { 
            text: 'Copy to vault',
            cls: 'content-pipeline-prompt-create-button'
        });
        moveBtn.onclick = () => onMoveToVault(prompt);

        // Bottom row: status and help text
        const finePrintEl = promptEl.createEl('small', { cls: 'content-pipeline-prompt-fine-print' });
        finePrintEl.textContent = 'Using prompt from configuration. Copy to vault to customize.';
    }

    /**
     * Render a vault-based prompt entry (using prompt from vault)
     */
    private renderVaultBasedPrompt(containerEl: HTMLElement, prompt: PromptStatus, onViewInVault: (prompt: PromptStatus) => void): void {
        const promptEl = containerEl.createEl('div', { cls: 'content-pipeline-prompt-item content-pipeline-prompt-vault-based' });

        // Top row: filename and button
        const topRow = promptEl.createEl('div', { cls: 'content-pipeline-prompt-top-row' });

        // Left side: filename (ensure path starts with /)
        const filenameEl = topRow.createEl('div', { cls: 'content-pipeline-prompt-filename' });
        const displayPath = prompt.path.startsWith('/') ? prompt.path : `/${prompt.path}`;
        filenameEl.textContent = displayPath;

        // Right side: button
        const viewBtn = topRow.createEl('button', { 
            text: 'View in vault',
            cls: 'content-pipeline-prompt-view-button'
        });
        viewBtn.onclick = () => onViewInVault(prompt);

        // Bottom row: status and help text
        const finePrintEl = promptEl.createEl('small', { cls: 'content-pipeline-prompt-fine-print' });
        finePrintEl.textContent = 'Using prompt from vault. Delete the file to revert to configuration version.';
    }

    /**
     * Render a single simplified prompt entry with horizontal layout and static fine print (legacy method)
     */
    private renderIndividualPrompt(containerEl: HTMLElement, prompt: PromptStatus, onCreate: (prompt: PromptStatus) => void): void {
        // This legacy method now delegates to the config-based rendering
        this.renderConfigBasedPrompt(containerEl, prompt, onCreate);
    }
}
