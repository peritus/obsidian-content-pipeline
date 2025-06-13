import { Notice } from 'obsidian';
import { validatePipelineConfig } from '../validation/pipeline-config';

/**
 * Configuration validation utilities
 */
export class ConfigurationValidator {
    /**
     * Validate configuration and show status
     */
    static validate(configText: string, showNotice: boolean): boolean {
        try {
            // First, try to parse JSON
            const parsed = JSON.parse(configText);
            
            // Then validate pipeline structure
            validatePipelineConfig(parsed);
            
            // If we get here, it's valid
            if (showNotice) {
                new Notice('✅ Configuration is valid!', 3000);
            }
            return true;
            
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            
            if (showNotice) {
                new Notice(`❌ Configuration error: ${errorMessage}`, 6000);
            }
            
            // Log detailed error for debugging
            console.error('Pipeline configuration validation failed:', error);
            
            return false;
        }
    }

    /**
     * Create validation status element
     */
    static createStatusElement(containerEl: HTMLElement): HTMLElement {
        const statusEl = containerEl.createEl('div');
        statusEl.style.marginBottom = '15px';
        statusEl.style.padding = '10px';
        statusEl.style.borderRadius = '4px';
        return statusEl;
    }

    /**
     * Update validation status display
     */
    static updateStatus(statusEl: HTMLElement, isValid: boolean, stepCount?: number): void {
        if (isValid && stepCount !== undefined) {
            statusEl.style.backgroundColor = '#d4edda';
            statusEl.style.border = '1px solid #c3e6cb';
            statusEl.style.color = '#155724';
            statusEl.innerHTML = `✅ <strong>Configuration Valid:</strong> ${stepCount} pipeline steps configured and ready`;
        } else {
            statusEl.style.backgroundColor = '#f8d7da';
            statusEl.style.border = '1px solid #f5c6cb';
            statusEl.style.color = '#721c24';
            statusEl.innerHTML = '❌ <strong>Configuration Invalid:</strong> Please fix JSON syntax or pipeline structure errors';
        }
    }
}
