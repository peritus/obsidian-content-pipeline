/**
 * Centralized Configuration Service
 * 
 * Eliminates configuration resolution duplication across the codebase by providing
 * a single source of truth for validated configurations.
 */

import { 
    ContentPipelineSettings, 
    PipelineConfiguration, 
    ModelsConfig,
    ResolvedPipelineStep 
} from '../types';
import { 
    validateConfig, 
    isValidConfig, 
    getConfigErrors,
    resolveStep,
    parseAndValidateConfig
} from '../validation';
import { ErrorFactory } from '../error-handler';
import { createLogger } from '../logger';

const logger = createLogger('ConfigurationService');

interface ConfigurationValidationResult {
    isValid: boolean;
    error?: string;
}

class ConfigurationService {
    private settings: ContentPipelineSettings;

    constructor(settings: ContentPipelineSettings) {
        this.settings = settings;
    }

    /**
     * Validate both models and pipeline configurations
     */
    validateConfigurations(): ConfigurationValidationResult {
        if (!this.settings.parsedModelsConfig || !this.settings.parsedPipelineConfig) {
            return { 
                isValid: false, 
                error: 'Configurations not parsed'
            };
        }

        try {
            validateConfig(this.settings.parsedModelsConfig, this.settings.parsedPipelineConfig);
            return { isValid: true };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error('Configuration validation failed:', errorMessage);
            return {
                isValid: false,
                error: errorMessage
            };
        }
    }

    /**
     * Get validated pipeline configuration
     * @throws Error if configuration is invalid
     */
    getValidatedPipelineConfiguration(): PipelineConfiguration {
        if (!this.settings.modelsConfig || !this.settings.pipelineConfig) {
            throw ErrorFactory.configuration(
                'Dual configuration not available',
                'Both models and pipeline configurations are required',
                { hasModels: !!this.settings.modelsConfig, hasPipeline: !!this.settings.pipelineConfig },
                ['Configure both models and pipeline in settings', 'Ensure configurations are saved']
            );
        }

        if (!this.settings.parsedModelsConfig || !this.settings.parsedPipelineConfig) {
            throw ErrorFactory.configuration(
                'Parsed configurations not available',
                'Configurations are not properly parsed',
                {},
                ['Reload plugin', 'Re-save configuration in settings']
            );
        }

        try {
            validateConfig(this.settings.parsedModelsConfig, this.settings.parsedPipelineConfig);
            return this.settings.parsedPipelineConfig;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw ErrorFactory.configuration(
                `Configuration validation failed: ${errorMessage}`,
                'Pipeline configuration contains validation errors',
                { error: errorMessage },
                ['Fix configuration errors in settings', 'Validate configuration before processing']
            );
        }
    }

    /**
     * Get validated models configuration
     * @throws Error if configuration is invalid
     */
    getValidatedModelsConfiguration(): ModelsConfig {
        // Validate that models configuration is available
        if (!this.settings.modelsConfig) {
            throw ErrorFactory.configuration(
                'Models configuration not available',
                'Models configuration is required',
                {},
                ['Configure models in settings', 'Ensure models configuration is saved']
            );
        }

        // Validate that parsed models configuration is available
        if (!this.settings.parsedModelsConfig) {
            throw ErrorFactory.configuration(
                'Parsed models configuration not available',
                'Models configuration is not parsed',
                {},
                ['Reload plugin', 'Re-save configuration in settings']
            );
        }

        logger.debug('Models configuration validated and returned');
        return this.settings.parsedModelsConfig;
    }

    /**
     * Safely get pipeline configuration with validation
     * Returns null if invalid, avoiding exceptions
     */
    getSafePipelineConfiguration(): PipelineConfiguration | null {
        try {
            const validationResult = this.validateConfigurations();
            if (!validationResult.isValid) {
                return null;
            }
            return this.settings.parsedPipelineConfig || null;
        } catch (error) {
            logger.warn('Failed to get safe pipeline configuration:', error);
            return null;
        }
    }

    /**
     * Resolve a specific pipeline step with full validation
     * @throws Error if step cannot be resolved
     */
    resolveStep(stepId: string): ResolvedPipelineStep {
        // Validate settings are available
        if (!this.settings.modelsConfig || !this.settings.pipelineConfig) {
            throw ErrorFactory.configuration(
                'Configuration not available',
                'Both models and pipeline configurations are required',
                { stepId },
                ['Configure models and pipeline in settings', 'Ensure configurations are saved']
            );
        }

        if (!this.settings.parsedModelsConfig || !this.settings.parsedPipelineConfig) {
            throw ErrorFactory.configuration(
                'Parsed configurations not available',
                'Configurations are not properly parsed',
                { stepId },
                ['Reload plugin', 'Re-save configuration in settings']
            );
        }

        try {
            return resolveStep(
                stepId,
                this.settings.parsedPipelineConfig,
                this.settings.parsedModelsConfig
            );
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw ErrorFactory.configuration(
                `Failed to resolve step configuration: ${errorMessage}`,
                `Cannot resolve step "${stepId}" configuration`,
                { stepId, error: errorMessage },
                ['Check step exists in pipeline configuration', 'Verify model config reference is valid', 'Validate configuration syntax']
            );
        }
    }

    /**
     * Check if configurations are ready for processing
     */
    isConfigurationReady(): boolean {
        const validationResult = this.validateConfigurations();
        return validationResult.isValid;
    }

    /**
     * Get configuration status with detailed information
     */
    getConfigurationStatus(): {
        isReady: boolean;
        hasModelsConfig: boolean;
        hasPipelineConfig: boolean;
        validationError?: string;
    } {
        const hasModelsConfig = !!(this.settings.modelsConfig && 
            Object.keys(this.settings.modelsConfig).length > 0);
        const hasPipelineConfig = !!(this.settings.pipelineConfig && 
            Object.keys(this.settings.pipelineConfig).length > 0);

        if (!hasModelsConfig || !hasPipelineConfig) {
            return {
                isReady: false,
                hasModelsConfig,
                hasPipelineConfig,
                validationError: 'Missing required configuration'
            };
        }

        const validationResult = this.validateConfigurations();
        return {
            isReady: validationResult.isValid,
            hasModelsConfig,
            hasPipelineConfig,
            validationError: validationResult.error
        };
    }

    /**
     * Get detailed validation errors
     */
    getValidationErrors(): string[] {
        if (!this.settings.parsedModelsConfig || !this.settings.parsedPipelineConfig) {
            return ['Configurations not parsed'];
        }

        return getConfigErrors(this.settings.parsedModelsConfig, this.settings.parsedPipelineConfig);
    }
}

/**
 * Factory function to create a ConfigurationService instance
 */
export function createConfigurationService(settings: ContentPipelineSettings): ConfigurationService {
    return new ConfigurationService(settings);
}