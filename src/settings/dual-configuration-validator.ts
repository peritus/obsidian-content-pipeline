/**
 * Dual configuration validator for v1.2 split configuration system
 * 
 * Provides comprehensive validation for both models and pipeline configurations
 * with cross-reference checking and user-friendly error reporting.
 */

import { Notice } from 'obsidian';
import { createConfigurationResolver, ConfigurationResolver } from '../validation/configuration-resolver';
import { ConfigValidationResult } from '../types';

/**
 * Validation utility for dual configuration system
 */
export class DualConfigurationValidator {

    /**
     * Validate both models and pipeline configurations
     * 
     * @param modelsConfigText - JSON string of models configuration
     * @param pipelineConfigText - JSON string of pipeline configuration  
     * @param showNotice - Whether to show notification for validation result
     * @returns Complete validation result
     */
    validate(modelsConfigText: string, pipelineConfigText: string, showNotice: boolean): ConfigValidationResult {
        try {
            // Create resolver (this performs parsing and basic validation)
            const resolver = createConfigurationResolver(modelsConfigText, pipelineConfigText);
            
            // Perform comprehensive validation
            const result = resolver.validate();
            
            if (showNotice) {
                if (result.isValid) {
                    this.showSuccessNotice('✅ Configuration is valid!');
                } else {
                    this.showValidationError(result);
                }
            }
            
            return result;
            
        } catch (error) {
            // Handle JSON parsing errors and other issues
            const errorMessage = error instanceof Error ? error.message : String(error);
            
            const result: ConfigValidationResult = {
                isValid: false,
                modelsErrors: [],
                pipelineErrors: [],
                crossRefErrors: [errorMessage],
                warnings: [],
                entryPoints: []
            };
            
            if (showNotice) {
                this.showValidationError(result);
            }
            
            return result;
        }
    }

    /**
     * Get configuration resolver for valid configurations
     * 
     * @param modelsConfigText - JSON string of models configuration
     * @param pipelineConfigText - JSON string of pipeline configuration
     * @returns Configuration resolver instance
     * @throws Error if configurations are invalid
     */
    getConfigurationResolver(modelsConfigText: string, pipelineConfigText: string): ConfigurationResolver {
        return createConfigurationResolver(modelsConfigText, pipelineConfigText);
    }

    /**
     * Show validation error with detailed information
     * 
     * @param validationResult - Validation result with errors
     */
    showValidationError(validationResult: ConfigValidationResult): void {
        const errorSections = [];
        
        if (validationResult.modelsErrors.length > 0) {
            errorSections.push(`Models: ${validationResult.modelsErrors.join('; ')}`);
        }
        
        if (validationResult.pipelineErrors.length > 0) {
            errorSections.push(`Pipeline: ${validationResult.pipelineErrors.join('; ')}`);
        }
        
        if (validationResult.crossRefErrors.length > 0) {
            errorSections.push(`Cross-reference: ${validationResult.crossRefErrors.join('; ')}`);
        }
        
        const message = errorSections.length > 0 
            ? `❌ Configuration errors: ${errorSections.join(' | ')}`
            : '❌ Configuration validation failed';
            
        new Notice(message, 8000);
    }

    /**
     * Show success notification
     * 
     * @param message - Success message to display
     */
    showSuccessNotice(message: string): void {
        new Notice(message, 3000);
    }

    /**
     * Show error notification
     * 
     * @param message - Error message to display
     */
    showErrorNotice(message: string): void {
        new Notice(message, 6000);
    }

    /**
     * Create validation status element with styling
     * 
     * @param containerEl - Parent container element
     * @returns Status element for updating validation state
     */
    static createStatusElement(containerEl: HTMLElement): HTMLElement {
        const statusEl = containerEl.createEl('div');
        statusEl.style.marginBottom = '15px';
        statusEl.style.padding = '15px';
        statusEl.style.borderRadius = '6px';
        statusEl.style.border = '1px solid var(--background-modifier-border)';
        statusEl.style.fontSize = '14px';
        return statusEl;
    }

    /**
     * Update validation status display with detailed information
     * 
     * @param statusEl - Status element to update
     * @param validationResult - Validation result to display
     */
    static updateStatus(statusEl: HTMLElement, validationResult: ConfigValidationResult): void {
        if (validationResult.isValid) {
            statusEl.style.backgroundColor = '#d4edda';
            statusEl.style.borderColor = '#c3e6cb';
            statusEl.style.color = '#155724';
            
            const entryPointsText = validationResult.entryPoints.length > 0 
                ? ` | Entry points: ${validationResult.entryPoints.join(', ')}`
                : '';
            
            statusEl.innerHTML = `
                <div style="font-weight: bold; margin-bottom: 5px;">✅ Configuration Valid</div>
                <div style="font-size: 13px; opacity: 0.9;">
                    Ready for processing${entryPointsText}
                </div>
            `;
        } else {
            statusEl.style.backgroundColor = '#f8d7da';
            statusEl.style.borderColor = '#f5c6cb';
            statusEl.style.color = '#721c24';
            
            const errorDetails = [];
            if (validationResult.modelsErrors.length > 0) {
                errorDetails.push(`Models: ${validationResult.modelsErrors.length} error(s)`);
            }
            if (validationResult.pipelineErrors.length > 0) {
                errorDetails.push(`Pipeline: ${validationResult.pipelineErrors.length} error(s)`);
            }
            if (validationResult.crossRefErrors.length > 0) {
                errorDetails.push(`References: ${validationResult.crossRefErrors.length} error(s)`);
            }
            
            const allErrors = [
                ...validationResult.modelsErrors,
                ...validationResult.pipelineErrors,
                ...validationResult.crossRefErrors
            ];
            
            statusEl.innerHTML = `
                <div style="font-weight: bold; margin-bottom: 8px;">❌ Configuration Invalid</div>
                <div style="font-size: 13px; margin-bottom: 8px;">
                    ${errorDetails.join(' | ')}
                </div>
                <details style="font-size: 12px;">
                    <summary style="cursor: pointer; margin-bottom: 5px;">Show detailed errors</summary>
                    <ul style="margin: 5px 0 0 15px; padding: 0;">
                        ${allErrors.map(error => `<li style="margin-bottom: 3px;">${error}</li>`).join('')}
                    </ul>
                </details>
            `;
        }
    }

    /**
     * Get validation summary for display
     * 
     * @param validationResult - Validation result to summarize
     * @returns Summary object with counts and status
     */
    static getValidationSummary(validationResult: ConfigValidationResult): {
        isValid: boolean;
        totalErrors: number;
        errorsByType: { [key: string]: number };
        entryPointCount: number;
    } {
        return {
            isValid: validationResult.isValid,
            totalErrors: validationResult.modelsErrors.length + 
                        validationResult.pipelineErrors.length + 
                        validationResult.crossRefErrors.length,
            errorsByType: {
                models: validationResult.modelsErrors.length,
                pipeline: validationResult.pipelineErrors.length,
                crossRef: validationResult.crossRefErrors.length
            },
            entryPointCount: validationResult.entryPoints.length
        };
    }

    /**
     * Format validation errors for console logging
     * 
     * @param validationResult - Validation result to format
     * @returns Formatted error string for debugging
     */
    static formatValidationErrors(validationResult: ConfigValidationResult): string {
        const sections = [];
        
        if (validationResult.modelsErrors.length > 0) {
            sections.push(`Models Configuration Errors:\n  ${validationResult.modelsErrors.join('\n  ')}`);
        }
        
        if (validationResult.pipelineErrors.length > 0) {
            sections.push(`Pipeline Configuration Errors:\n  ${validationResult.pipelineErrors.join('\n  ')}`);
        }
        
        if (validationResult.crossRefErrors.length > 0) {
            sections.push(`Cross-Reference Errors:\n  ${validationResult.crossRefErrors.join('\n  ')}`);
        }
        
        if (validationResult.warnings.length > 0) {
            sections.push(`Warnings:\n  ${validationResult.warnings.join('\n  ')}`);
        }
        
        return sections.length > 0 ? sections.join('\n\n') : 'No errors found';
    }
}