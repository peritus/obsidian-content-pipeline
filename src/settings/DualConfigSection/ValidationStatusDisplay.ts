/**
 * Validation status display component
 */

export class ValidationStatusDisplay {
    private validationStatusEl: HTMLElement | null = null;

    /**
     * Render validation status element
     */
    render(containerEl: HTMLElement): HTMLElement {
        this.validationStatusEl = containerEl.createEl('div');
        this.validationStatusEl.style.marginBottom = '20px';
        this.validationStatusEl.style.padding = '15px';
        this.validationStatusEl.style.borderRadius = '6px';
        this.validationStatusEl.style.border = '1px solid var(--background-modifier-border)';
        return this.validationStatusEl;
    }

    /**
     * Update validation status display
     */
    update(validationResult: any): void {
        if (!this.validationStatusEl) return;

        if (validationResult.isValid) {
            this.validationStatusEl.style.backgroundColor = '#d4edda';
            this.validationStatusEl.style.borderColor = '#c3e6cb';
            this.validationStatusEl.style.color = '#155724';
            
            const entryPointsText = validationResult.entryPoints.length > 0 
                ? ` | Entry points: ${validationResult.entryPoints.join(', ')}`
                : '';
            
            this.validationStatusEl.innerHTML = `✅ <strong>Configuration Valid</strong>${entryPointsText}`;
        } else {
            this.validationStatusEl.style.backgroundColor = '#f8d7da';
            this.validationStatusEl.style.borderColor = '#f5c6cb';
            this.validationStatusEl.style.color = '#721c24';
            
            const errorSections = [];
            if (validationResult.modelsErrors.length > 0) {
                errorSections.push(`Models: ${validationResult.modelsErrors.length} errors`);
            }
            if (validationResult.pipelineErrors.length > 0) {
                errorSections.push(`Pipeline: ${validationResult.pipelineErrors.length} errors`);
            }
            if (validationResult.crossRefErrors.length > 0) {
                errorSections.push(`Cross-ref: ${validationResult.crossRefErrors.length} errors`);
            }
            
            this.validationStatusEl.innerHTML = `❌ <strong>Configuration Invalid:</strong> ${errorSections.join(' | ')}`;
        }
    }

    /**
     * Update validation status display with auto-save information
     */
    updateWithAutoSave(validationResult: any, saveSuccess: boolean, error?: any): void {
        if (!this.validationStatusEl) return;

        if (validationResult.isValid) {
            this.validationStatusEl.style.backgroundColor = '#d4edda';
            this.validationStatusEl.style.borderColor = '#c3e6cb';
            this.validationStatusEl.style.color = '#155724';
            
            const entryPointsText = validationResult.entryPoints.length > 0 
                ? ` | Entry points: ${validationResult.entryPoints.join(', ')}`
                : '';
            
            const autoSaveText = saveSuccess 
                ? ' | 💾 Auto-saved'
                : ` | ❌ Auto-save failed: ${error instanceof Error ? error.message : String(error)}`;
            
            this.validationStatusEl.innerHTML = `✅ <strong>Configuration Valid</strong>${entryPointsText}${autoSaveText}`;
        } else {
            // Invalid configuration, use the standard invalid display
            this.update(validationResult);
        }
    }
}