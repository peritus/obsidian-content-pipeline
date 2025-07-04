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
import { ContentPipelineError } from '../errors';
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
     * @throws ContentPipelineError if configuration is invalid
     */
    getValidatedPipelineConfiguration(): PipelineConfiguration {
        if (!this.settings.modelsConfig || !this.settings.pipelineConfig) {
            throw new ContentPipelineError('Configuration not available - both models and pipeline configurations are required');
        }

        if (!this.settings.parsedModelsConfig || !this.settings.parsedPipelineConfig) {
            throw new ContentPipelineError('Configuration not available - configurations are not properly parsed');
        }

        try {
            validateConfig(this.settings.parsedModelsConfig, this.settings.parsedPipelineConfig);
            return this.settings.parsedPipelineConfig;
        } catch (error) {
            throw new ContentPipelineError(`Configuration validation failed: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error : undefined);
        }
    }

    /**
     * Get validated models configuration
     * @throws ContentPipelineError if configuration is invalid
     */
    getValidatedModelsConfiguration(): ModelsConfig {
        if (!this.settings.modelsConfig) {
            throw new ContentPipelineError('Models configuration not available');
        }

        if (!this.settings.parsedModelsConfig) {
            throw new ContentPipelineError('Models configuration is not parsed');
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
     * @throws ContentPipelineError if step cannot be resolved
     */
    resolveStep(stepId: string): ResolvedPipelineStep {
        if (!this.settings.modelsConfig || !this.settings.pipelineConfig) {
            throw new ContentPipelineError(`Configuration not available for step "${stepId}" - both models and pipeline configurations are required`);
        }

        if (!this.settings.parsedModelsConfig || !this.settings.parsedPipelineConfig) {
            throw new ContentPipelineError(`Configuration not available for step "${stepId}" - configurations are not properly parsed`);
        }

        try {
            return resolveStep(
                stepId,
                this.settings.parsedPipelineConfig,
                this.settings.parsedModelsConfig
            );
        } catch (error) {
            throw new ContentPipelineError(`Failed to resolve step "${stepId}" configuration: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error : undefined);
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