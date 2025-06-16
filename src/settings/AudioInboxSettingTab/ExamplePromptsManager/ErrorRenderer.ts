import { DEFAULT_CONFIGS } from '@/configs';
import { PromptStatus } from '../prompt-file-operations';

/**
 * Handles error display and rendering for the Example Prompts Manager
 */
export class ErrorRenderer {
    /**
     * Show configuration error with debug information
     */
    static showConfigError(containerEl: HTMLElement, message: string): void {
        const errorEl = containerEl.createEl('div');
        errorEl.addClass('example-prompts-config-error');
        
        const configDebugInfo = {
            'DEFAULT_CONFIGS exists': !!DEFAULT_CONFIGS,
            'DEFAULT_CONFIGS keys': DEFAULT_CONFIGS ? Object.keys(DEFAULT_CONFIGS) : [],
            'default config exists': !!(DEFAULT_CONFIGS?.['default']),
            'default config keys': DEFAULT_CONFIGS?.['default'] ? Object.keys(DEFAULT_CONFIGS['default']) : [],
        };
        
        errorEl.innerHTML = `
            ❌ <strong>Configuration Error:</strong> ${message}
            <details style="margin-top: 10px;">
                <summary>Debug Information</summary>
                <pre style="font-size: 12px; margin-top: 10px; overflow-x: auto;">${JSON.stringify(configDebugInfo, null, 2)}</pre>
            </details>
        `;
    }

    /**
     * Render error prompts section
     */
    static renderErrorPrompts(containerEl: HTMLElement, errorPrompts: PromptStatus[]): void {
        if (errorPrompts.length === 0) return;

        const errorEl = containerEl.createEl('div');
        errorEl.addClass('example-prompts-errors');
        errorEl.innerHTML = `
            <strong>⚠️ Errors detected:</strong><br>
            ${errorPrompts.map(p => `• <code>${p.path}</code>: ${p.error}`).join('<br>')}
        `;
    }

    /**
     * Handle overall errors with enhanced error display
     */
    static handleOverallError(containerEl: HTMLElement, error: unknown): void {
        containerEl.empty();
        const errorEl = containerEl.createEl('div');
        errorEl.addClass('example-prompts-overall-error');
        errorEl.innerHTML = `
            <div style="font-size: 18px; margin-bottom: 10px;">⚠️</div>
            <div style="font-weight: bold; margin-bottom: 8px;">Error Checking Prompts</div>
            <div style="font-size: 14px; opacity: 0.8;">${error instanceof Error ? error.message : String(error)}</div>
        `;
        
        console.error('Error in updatePromptsStatus:', error);
    }

    /**
     * Show warning for no example prompts
     */
    static showNoPromptsWarning(containerEl: HTMLElement): void {
        const warningEl = containerEl.createEl('div');
        warningEl.addClass('example-prompts-warning');
        warningEl.innerHTML = '⚠️ <strong>Warning:</strong> No example prompts found in configuration.';
    }
}
