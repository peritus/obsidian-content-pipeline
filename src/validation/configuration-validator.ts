/**
 * Centralized Configuration Validation Service
 * 
 * Provides unified configuration validation for all components,
 * eliminating scattered validation logic across the codebase.
 */

import { AudioInboxSettings, PipelineConfiguration } from '../types';
import { createConfigurationResolver } from '../validation/configuration-resolver';
import { ErrorFactory } from '../error-handler';
import { createLogger } from '../logger';

const logger = createLogger('ConfigurationValidator');

interface ConfigurationValidationResult {
    isValid: boolean;
    error?: string;
    modelsErrors?: string[];
    pipelineErrors?: string[];
    crossRefErrors?: string[];
}

class ConfigurationValidator {
    private settings: AudioInboxSettings;

    constructor(settings: AudioInboxSettings) {
        this.settings = settings;
    }

    /**
     * Validate configurations and return detailed status (non-throwing)
     * Used by commands and UI components that need graceful validation
     */
    validateConfigurations(): ConfigurationValidationResult {
        // Check if parsed configurations exist
        if (!this.settings.parsedModelsConfig) {
            return { 
                isValid: false, 
                error: 'Models configuration not parsed',
                modelsErrors: ['Models configuration not parsed'],
                pipelineErrors: [],
                crossRefErrors: []
            };
        }
        
        if (!this.settings.parsedPipelineConfig) {
            return { 
                isValid: false, 
                error: 'Pipeline configuration not parsed',
                modelsErrors: [],
                pipelineErrors: ['Pipeline configuration not parsed'],
                crossRefErrors: []
            };
        }
        
        try {
            const resolver = createConfigurationResolver(
                this.settings.modelsConfig,
                this.settings.pipelineConfig
            );
            
            const validationResult = resolver.validate();
            
            if (!validationResult.isValid) {
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
                
                return { 
                    isValid: false, 
                    error: errorSections.join(', '),
                    modelsErrors: validationResult.modelsErrors,
                    pipelineErrors: validationResult.pipelineErrors,
                    crossRefErrors: validationResult.crossRefErrors
                };
            }
            
            logger.debug('Configuration validation passed');
            return { 
                isValid: true,
                modelsErrors: [],
                pipelineErrors: [],
                crossRefErrors: []
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error('Configuration validation failed with exception:', error);
            return { 
                isValid: false, 
                error: errorMessage,
                modelsErrors: [],
                pipelineErrors: [],
                crossRefErrors: [errorMessage]
            };
        }
    }

    /**
     * Get validated pipeline configuration (throwing version)
     * Used by pipeline executor that needs to fail fast on invalid configuration
     */
    getValidatedPipelineConfiguration(): PipelineConfiguration {
        // Validate that dual configuration is available
        if (!this.settings.modelsConfig || !this.settings.pipelineConfig) {
            throw ErrorFactory.configuration(
                'Dual configuration not available',
                'Both models and pipeline configurations are required',
                { hasModels: !!this.settings.modelsConfig, hasPipeline: !!this.settings.pipelineConfig },
                ['Configure both models and pipeline in settings', 'Ensure configurations are saved']
            );
        }

        // Use ConfigurationResolver to validate configuration is resolvable
        try {
            const resolver = createConfigurationResolver(
                this.settings.modelsConfig,
                this.settings.pipelineConfig
            );
            
            const validationResult = resolver.validate();
            if (!validationResult.isValid) {
                const errorSummary = [
                    ...validationResult.modelsErrors,
                    ...validationResult.pipelineErrors,
                    ...validationResult.crossRefErrors
                ].join('; ');
                
                throw ErrorFactory.configuration(
                    `Configuration validation failed: ${errorSummary}`,
                    'Pipeline configuration contains validation errors',
                    { validationResult },
                    ['Fix configuration errors in settings', 'Validate configuration before processing']
                );
            }

            // Return parsed pipeline configuration
            if (!this.settings.parsedPipelineConfig) {
                throw ErrorFactory.configuration(
                    'Parsed pipeline configuration not available',
                    'Pipeline configuration is not parsed',
                    {},
                    ['Reload plugin', 'Re-save configuration in settings']
                );
            }

            logger.debug('Pipeline configuration validated and returned');
            return this.settings.parsedPipelineConfig;

        } catch (error) {
            if (error instanceof Error && error.name === 'AudioInboxError') {
                throw error; // Re-throw our custom errors
            }
            
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw ErrorFactory.configuration(
                `Failed to validate configuration: ${errorMessage}`,
                'Cannot validate dual configuration for pipeline execution',
                { error: errorMessage },
                ['Check configuration syntax', 'Verify model config references', 'Reload plugin']
            );
        }
    }

    /**
     * Check if configurations are available for processing
     * Quick check without full validation
     */
    hasRequiredConfigurations(): boolean {
        return !!(this.settings.parsedModelsConfig && this.settings.parsedPipelineConfig);
    }

    /**
     * Get configuration status summary for display
     */
    getConfigurationStatus(): string {
        const validationResult = this.validateConfigurations();
        
        if (validationResult.isValid) {
            const stepCount = this.settings.parsedPipelineConfig ? Object.keys(this.settings.parsedPipelineConfig).length : 0;
            return `Valid (${stepCount} steps)`;
        } else {
            return `Invalid (${validationResult.error})`;
        }
    }

    /**
     * Update settings reference when settings change
     */
    updateSettings(settings: AudioInboxSettings): void {
        this.settings = settings;
        logger.debug('Configuration validator updated with new settings');
    }
}

/**
 * Factory function to create a configuration validator
 */
export function createConfigurationValidator(settings: AudioInboxSettings): ConfigurationValidator {
    return new ConfigurationValidator(settings);
}