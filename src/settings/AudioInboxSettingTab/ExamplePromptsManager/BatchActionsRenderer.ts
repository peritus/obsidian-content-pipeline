import { PromptStatus } from '../prompt-file-operations';
import { UIHelpers } from './UIHelpers';

/**
 * Handles rendering batch action buttons for missing prompts
 */
export class BatchActionsRenderer {
    /**
     * Render batch action buttons for missing prompts
     */
    static renderBatchActions(
        containerEl: HTMLElement, 
        missingPrompts: PromptStatus[], 
        onCreateAll: () => void, 
        onCheckAgain: () => void
    ): void {
        const batchActionsEl = containerEl.createEl('div');
        batchActionsEl.addClass('example-prompts-batch-actions');

        const batchLabel = batchActionsEl.createEl('div');
        batchLabel.style.cssText = 'font-weight: bold; margin-bottom: 10px; color: var(--text-normal);';
        batchLabel.textContent = '⚡ Quick Actions';

        const buttonContainer = batchActionsEl.createEl('div');
        buttonContainer.style.cssText = 'display: flex; gap: 12px; flex-wrap: wrap;';

        this.createCreateAllButton(buttonContainer, missingPrompts.length, onCreateAll);
        this.createCheckAgainButton(buttonContainer, onCheckAgain);
    }

    /**
     * Create the "Create All" button
     */
    private static createCreateAllButton(container: HTMLElement, count: number, onClick: () => void): void {
        const createAllBtn = container.createEl('button', { 
            text: `📝 Create All Missing Prompts (${count})` 
        });
        createAllBtn.style.cssText = UIHelpers.getStyles().primaryButton;
        createAllBtn.onclick = onClick;
    }

    /**
     * Create the "Check Again" button
     */
    private static createCheckAgainButton(container: HTMLElement, onClick: () => void): void {
        const checkAgainBtn = container.createEl('button', { text: '🔄 Check Again' });
        checkAgainBtn.style.cssText = UIHelpers.getStyles().secondaryButton;
        checkAgainBtn.onclick = onClick;
    }
}
