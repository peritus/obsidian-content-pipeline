import { PromptStatus } from '../prompt-file-operations';
import { UIHelpers } from './UIHelpers';

/**
 * Handles rendering status summaries and overview displays
 */
export class StatusRenderer {
    /**
     * Render status summary section
     */
    static renderStatusSummary(
        containerEl: HTMLElement, 
        missingPrompts: PromptStatus[], 
        existingPrompts: PromptStatus[], 
        errorPrompts: PromptStatus[]
    ): void {
        const summaryEl = containerEl.createEl('div');
        summaryEl.addClass('example-prompts-status-summary');
        
        const statusText = summaryEl.createEl('div');
        statusText.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 5px;">📊 Prompt Status Overview</div>
            <div style="display: flex; gap: 15px; align-items: center; flex-wrap: wrap;">
                <span style="display: flex; align-items: center; gap: 5px;">
                    ${UIHelpers.createStatusDot('#28a745')}
                    <strong>${existingPrompts.length}</strong> exist
                </span>
                <span style="display: flex; align-items: center; gap: 5px;">
                    ${UIHelpers.createStatusDot('#ffc107')}
                    <strong>${missingPrompts.length}</strong> missing
                </span>
                ${errorPrompts.length > 0 ? `
                    <span style="display: flex; align-items: center; gap: 5px;">
                        ${UIHelpers.createStatusDot('#dc3545')}
                        <strong>${errorPrompts.length}</strong> errors
                    </span>
                ` : ''}
            </div>
        `;

        const totalInfo = summaryEl.createEl('div');
        totalInfo.style.cssText = 'font-size: 14px; color: var(--text-muted); text-align: right;';
        totalInfo.textContent = `Total: ${missingPrompts.length + existingPrompts.length + errorPrompts.length} prompts`;
    }

    /**
     * Render all prompts exist state
     */
    static renderAllExistState(containerEl: HTMLElement, existingPrompts: PromptStatus[], onCheckAgain: () => void): void {
        const allExistEl = containerEl.createEl('div');
        allExistEl.addClass('example-prompts-all-exist');
        allExistEl.innerHTML = `
            <div style="font-size: 18px; margin-bottom: 10px;">🎉</div>
            <div style="font-weight: bold; font-size: 16px; margin-bottom: 8px;">All Example Prompts Ready!</div>
            <div style="font-size: 14px; opacity: 0.8;">All ${existingPrompts.length} example prompts already exist in your vault.</div>
        `;
        
        // Add check again button
        const checkAgainBtn = containerEl.createEl('button', { text: '🔄 Check Again' });
        checkAgainBtn.addClass('example-prompts-check-again');
        checkAgainBtn.onclick = onCheckAgain;
    }

    /**
     * Show loading state with shimmer animation
     */
    static renderLoadingState(containerEl: HTMLElement): void {
        containerEl.empty();
        UIHelpers.addShimmerAnimation();
        
        const loadingEl = containerEl.createEl('div');
        loadingEl.style.cssText = UIHelpers.getStyles().shimmerLoading;
        loadingEl.innerHTML = '🔄 <strong>Checking prompt file existence...</strong><br><small>Scanning vault for existing prompts</small>';
    }
}
