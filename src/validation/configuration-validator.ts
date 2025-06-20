/**
 * Centralized Configuration Validation Service (v2.0)
 * 
 * Provides unified configuration validation for all components,
 * including routing-aware output path validation.
 */

import { 
    ContentPipelineSettings, 
    PipelineConfiguration, 
    ConfigValidationResult,
    isRoutingAwareOutput,
    isValidRoutingAwareOutput 
} from '../types';
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
    outputRoutingErrors?: string[];
}

class ConfigurationValidator {
    private settings: ContentPipelineSettings;

    constructor(settings: ContentPipelineSettings) {
        this.settings = settings;
    }

    /**
     * Validate output configuration for routing-aware paths
     * 
     * @param stepId - Step ID for context
     * @param step - Pipeline step to validate
     * @param availableNextSteps - Available next step options
     * @returns Validation errors (empty array if valid)
     */
    validateOutputConfiguration(stepId: string, step: any, availableNextSteps: string[]): string[] {
        const errors: string[] = [];

        if (!step.output) {
            errors.push(`Step "${stepId}": Missing output configuration`);
            return errors;
        }

        // Handle string output (backward compatibility)
        if (typeof step.output === 'string') {
            return errors; // Valid string output, no routing validation needed
        }

        // Handle routing-aware output
        if (isRoutingAwareOutput(step.output)) {
            if (!isValidRoutingAwareOutput(step.output)) {
                errors.push(`Step "${stepId}": Invalid routing-aware output structure - all values must be strings`);
                return errors;
            }

            const outputKeys = Object.keys(step.output);
            const routingKeys = outputKeys.filter(key => key !== 'default');

            // Validate all nextStep options have corresponding output paths
            const missingOutputPaths = availableNextSteps.filter(nextStep => !outputKeys.includes(nextStep));
            if (missingOutputPaths.length > 0) {
                errors.push(`Step "${stepId}": Missing output paths for next steps: ${missingOutputPaths.join(', ')}`);
            }

            // Warn about unused output paths (not an error, but useful feedback)
            const unusedOutputPaths = routingKeys.filter(key => !availableNextSteps.includes(key));
            if (unusedOutputPaths.length > 0) {
                logger.warn(`Step "${stepId}": Unused output paths configured: ${unusedOutputPaths.join(', ')}`);
            }

            // Validate path patterns are valid (basic check)
            for (const [key, pathValue] of Object.entries(step.output)) {
                if (typeof pathValue !== 'string' || pathValue.trim().length === 0) {
                    errors.push(`Step "${stepId}": Invalid output path for "${key}" - must be non-empty string`);
                    continue; // Skip further validation for this invalid path
                }

                // Now we know pathValue is a string, so we can safely use it
                const path = pathValue as string;

                // Check for supported variables in path patterns
                const supportedVariables = ['{filename}', '{timestamp}', '{date}', '{stepId}'];
                const invalidVariables = this.extractVariables(path).filter(
                    variable => !supportedVariables.includes(variable)
                );
                if (invalidVariables.length > 0) {
                    errors.push(`Step "${stepId}": Unsupported variables in output path "${key}": ${invalidVariables.join(', ')}`);
                }
            }

            // Recommend default fallback if not present
            if (!step.output.default) {
                logger.warn(`Step "${stepId}": No default fallback configured - routing failures will cause pipeline errors`);
            }
        } else {
            errors.push(`Step "${stepId}": Invalid output configuration - must be string or routing-aware object`);
        }

        return errors;
    }

    /**
     * Extract variable placeholders from path patterns
     * 
     * @param path - Path pattern to analyze
     * @returns Array of variable placeholders found
     */
    private extractVariables(path: string): string[] {
        const variableRegex = /\{[^}]+\}/g;
        return path.match(variableRegex) || [];
    }

    /**
     * Validate for output path conflicts across steps
     * 
     * @param pipelineConfig - Complete pipeline configuration
     * @returns Array of conflict errors
     */
    validateOutputPathConflicts(pipelineConfig: PipelineConfiguration): string[] {
        const errors: string[] = [];
        const pathMapping = new Map<string, string[]>(); // path -> [stepIds]

        Object.entries(pipelineConfig).forEach(([stepId, step]) => {
            const outputPaths: string[] = [];

            if (typeof step.output === 'string') {
                outputPaths.push(step.output);
            } else if (isRoutingAwareOutput(step.output)) {
                outputPaths.push(...Object.values(step.output));
            }

            outputPaths.forEach(path => {
                if (!pathMapping.has(path)) {
                    pathMapping.set(path, []);
                }
                pathMapping.get(path)!.push(stepId);
            });
        });

        // Find conflicts
        pathMapping.forEach((stepIds, path) => {
            if (stepIds.length > 1) {
                errors.push(`Output path conflict: "${path}" used by steps: ${stepIds.join(', ')}`);
            }
        });

        return errors;
    }

    /**
     * Validate configurations and return detailed status (non-throwing)
     * Updated to include output routing validation
     */
    validateConfigurations(): ConfigurationValidationResult {
        // Check if parsed configurations exist
        if (!this.settings.parsedModelsConfig) {
            return { 
                isValid: false, 
                error: 'Models configuration not parsed',
                modelsErrors: ['Models configuration not parsed'],
                pipelineErrors: [],
                crossRefErrors: [],
                outputRoutingErrors: []
            };
        }
        
        if (!this.settings.parsedPipelineConfig) {
            return { 
                isValid: false, 
                error: 'Pipeline configuration not parsed',
                modelsErrors: [],
                pipelineErrors: ['Pipeline configuration not parsed'],
                crossRefErrors: [],
                outputRoutingErrors: []
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
                if (validationResult.outputRoutingErrors.length > 0) {
                    errorSections.push(`Output routing: ${validationResult.outputRoutingErrors.length} errors`);
                }
                
                return { 
                    isValid: false, 
                    error: errorSections.join(', '),
                    modelsErrors: validationResult.modelsErrors,
                    pipelineErrors: validationResult.pipelineErrors,
                    crossRefErrors: validationResult.crossRefErrors,
                    outputRoutingErrors: validationResult.outputRoutingErrors
                };
            }
            
            logger.debug('Configuration validation passed');
            return { 
                isValid: true,
                modelsErrors: [],
                pipelineErrors: [],
                crossRefErrors: [],
                outputRoutingErrors: []
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error('Configuration validation failed with exception:', error);
            return { 
                isValid: false, 
                error: errorMessage,
                modelsErrors: [],
                pipelineErrors: [],
                crossRefErrors: [errorMessage],
                outputRoutingErrors: []
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
                    ...validationResult.crossRefErrors,
                    ...validationResult.outputRoutingErrors
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
            if (error instanceof Error && error.name === 'ContentPipelineError') {
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
    updateSettings(settings: ContentPipelineSettings): void {
        this.settings = settings;
        logger.debug('Configuration validator updated with new settings');
    }
}

/**
 * Factory function to create a configuration validator
 */
export function createConfigurationValidator(settings: ContentPipelineSettings): ConfigurationValidator {
    return new ConfigurationValidator(settings);
}
