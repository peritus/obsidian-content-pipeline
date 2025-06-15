/**
 * Models configuration validation utility
 * 
 * Validates model configurations including API credentials and implementation mappings
 * for the v1.2 split configuration system.
 */

import { ErrorFactory } from '../error-handler';
import { ModelsConfig, ModelConfig, ModelImplementation, isValidModelImplementation } from '../types';
import { validateApiKey } from './api-key/validateApiKey';

/**
 * Valid URL pattern for base URLs
 */
const URL_PATTERN = /^https?:\/\/[^\s/$.?#].[^\s]*$/;

/**
 * Valid configuration ID pattern - alphanumeric, hyphens, underscores only
 */
const CONFIG_ID_PATTERN = /^[a-z0-9]+([a-z0-9\-_]*[a-z0-9]+)*$/;

/**
 * Implementation to client class mapping
 */
export const IMPLEMENTATION_MAPPING = {
    whisper: 'WhisperClient',
    chatgpt: 'ChatGPTClient', 
    claude: 'ClaudeClient'
} as const;

/**
 * Supported model names for each implementation
 */
const SUPPORTED_MODELS_BY_IMPLEMENTATION: Record<ModelImplementation, string[]> = {
    whisper: ['whisper-1'],
    chatgpt: ['gpt-4', 'gpt-4-turbo', 'gpt-4o', 'gpt-3.5-turbo', 'gpt-3.5-turbo-16k'],
    claude: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku', 'claude-3.5-sonnet']
};

/**
 * Validate a complete models configuration
 * 
 * @param config - The models configuration to validate
 * @returns true if valid
 * @throws AudioInboxError if invalid
 */
export function validateModelsConfig(config: ModelsConfig): true {
    if (!config || typeof config !== 'object' || Array.isArray(config)) {
        throw ErrorFactory.validation(
            'Invalid models configuration - must be a valid object',
            'Models configuration must be a valid object',
            { config },
            ['Provide a valid configuration object', 'Check JSON syntax', 'Configuration cannot be null, undefined, or an array']
        );
    }

    const configIds = Object.keys(config);

    // Check if configuration is empty
    if (configIds.length === 0) {
        throw ErrorFactory.validation(
            'Empty models configuration - cannot be empty',
            'Models configuration cannot be empty',
            { config },
            ['Add at least one model configuration', 'Check the configuration format']
        );
    }

    // Validate reasonable number of model configs
    if (configIds.length > 50) {
        throw ErrorFactory.validation(
            `Too many model configurations: ${configIds.length} - too many model configurations`,
            'Models configuration has too many entries (maximum 50 recommended)',
            { configCount: configIds.length },
            ['Reduce number of model configurations', 'Remove unused configurations', 'Simplify model setup']
        );
    }

    // Validate config ID format
    configIds.forEach(configId => {
        if (!configId || typeof configId !== 'string') {
            throw ErrorFactory.validation(
                'Invalid model config ID',
                'Model configuration IDs must be non-empty strings',
                { configId },
                ['Use valid string IDs for model configs', 'Remove empty or invalid config IDs']
            );
        }

        // Check config ID format
        if (!CONFIG_ID_PATTERN.test(configId.trim())) {
            throw ErrorFactory.validation(
                `Invalid model config ID format: ${configId} - config ID must start with a letter or number`,
                `Model config ID "${configId}" must contain only lowercase letters, numbers, hyphens, and underscores`,
                { configId },
                ['Use only lowercase letters, numbers, -, and _', 'Start and end with alphanumeric characters', 'Example: "openai-gpt", "anthropic-claude"']
            );
        }
    });

    // Check for duplicate config IDs (should not happen in object, but good to be explicit)
    const uniqueConfigIds = new Set(configIds);
    if (uniqueConfigIds.size !== configIds.length) {
        throw ErrorFactory.validation(
            'Duplicate model config IDs found',
            'Models configuration contains duplicate config IDs',
            { configIds, uniqueCount: uniqueConfigIds.size },
            ['Ensure all config IDs are unique', 'Check for repeated config names']
        );
    }

    // Validate each model config individually
    configIds.forEach(configId => {
        try {
            validateModelConfig(config[configId], configId);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            // Re-throw with models config context
            throw ErrorFactory.validation(
                `Model config validation failed: ${errorMessage} - config is invalid`,
                `Model config "${configId}" is invalid`,
                { configId, config: config[configId], originalError: error },
                ['Fix the model configuration', 'Check config format and required fields']
            );
        }
    });

    return true;
}

/**
 * Validate a single model configuration
 * 
 * @param config - The model configuration to validate
 * @param configId - The ID of the config (for context in error messages)
 * @returns true if valid
 * @throws AudioInboxError if invalid
 */
export function validateModelConfig(config: ModelConfig, configId: string): true {
    if (!config || typeof config !== 'object' || Array.isArray(config)) {
        throw ErrorFactory.validation(
            `Invalid model config for ${configId} - config missing or invalid`,
            `Model configuration "${configId}" is missing or invalid`,
            { configId, config },
            ['Provide a valid model configuration object', 'Check the JSON syntax']
        );
    }

    // Validate required fields
    const requiredFields = ['baseUrl', 'apiKey', 'implementation', 'model'];
    const missingFields = requiredFields.filter(field => !(field in config));
    
    if (missingFields.length > 0) {
        throw ErrorFactory.validation(
            `Missing required fields in model config ${configId}: ${missingFields.join(', ')} - missing required fields`,
            `Model config "${configId}" is missing required fields: ${missingFields.join(', ')}`,
            { configId, missingFields, requiredFields },
            ['Add missing fields to model configuration', 'Check the configuration format']
        );
    }

    // Validate baseUrl
    if (!config.baseUrl || typeof config.baseUrl !== 'string' || config.baseUrl.trim().length === 0) {
        throw ErrorFactory.validation(
            `Invalid baseUrl in model config ${configId} - baseUrl must be a non-empty string`,
            `Model config "${configId}" baseUrl must be a non-empty string`,
            { configId, baseUrl: config.baseUrl },
            ['Provide a valid API endpoint URL', 'Example: https://api.openai.com/v1']
        );
    }

    const trimmedUrl = config.baseUrl.trim();
    if (!URL_PATTERN.test(trimmedUrl)) {
        throw ErrorFactory.validation(
            `Invalid baseUrl format in model config ${configId}: ${trimmedUrl} - not a valid URL`,
            `Model config "${configId}" baseUrl is not a valid URL`,
            { configId, baseUrl: trimmedUrl },
            ['Use a valid HTTP/HTTPS URL', 'Example: https://api.openai.com/v1', 'Check URL format']
        );
    }

    // Validate apiKey (always validate if provided, even if empty)
    if (config.apiKey !== undefined) {
        try {
            validateApiKey(config.apiKey);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw ErrorFactory.validation(
                `Invalid API key in model config ${configId}: ${errorMessage} - invalid API key format`,
                `Model config "${configId}" has invalid API key format`,
                { configId, originalError: error },
                ['Check API key format', 'Get a valid API key from your provider']
            );
        }
    }

    // Validate implementation
    if (!config.implementation || typeof config.implementation !== 'string') {
        throw ErrorFactory.validation(
            `Invalid implementation in model config ${configId} - implementation must be a string`,
            `Model config "${configId}" implementation must be a string`,
            { configId, implementation: config.implementation },
            ['Specify a valid implementation type', 'Supported: whisper, chatgpt, claude']
        );
    }

    if (!isValidModelImplementation(config.implementation)) {
        throw ErrorFactory.validation(
            `Unsupported implementation in model config ${configId}: ${config.implementation} - unsupported implementation`,
            `Model config "${configId}" uses unsupported implementation: ${config.implementation}`,
            { configId, implementation: config.implementation, supportedImplementations: ['whisper', 'chatgpt', 'claude'] },
            ['Supported implementations: whisper, chatgpt, claude', 'Use a supported implementation type', 'Check for typos']
        );
    }

    // Validate model name
    if (!config.model || typeof config.model !== 'string' || config.model.trim().length === 0) {
        throw ErrorFactory.validation(
            `Invalid model in model config ${configId} - model must be a non-empty string`,
            `Model config "${configId}" model must be a non-empty string`,
            { configId, model: config.model },
            ['Specify a valid model name', 'Check supported models for your implementation']
        );
    }

    const trimmedModel = config.model.trim();
    const supportedModels = SUPPORTED_MODELS_BY_IMPLEMENTATION[config.implementation];
    if (!supportedModels.includes(trimmedModel)) {
        throw ErrorFactory.validation(
            `Unsupported model in model config ${configId}: ${trimmedModel} - unsupported model for ${config.implementation}`,
            `Model config "${configId}" uses unsupported model: ${trimmedModel} for implementation ${config.implementation}`,
            { configId, model: trimmedModel, implementation: config.implementation, supportedModels },
            [
                `Supported models for ${config.implementation}: ${supportedModels.join(', ')}`,
                'Use a supported model name for this implementation',
                'Check for typos in model name'
            ]
        );
    }

    // Validate optional organization
    if (config.organization !== undefined) {
        if (typeof config.organization !== 'string') {
            throw ErrorFactory.validation(
                `Invalid organization in model config ${configId}`,
                `Model config "${configId}" organization must be a string`,
                { configId, organization: config.organization },
                ['Provide a valid organization string', 'Remove organization if not needed']
            );
        }
    }

    return true;
}

/**
 * Get client class name for a model implementation
 * 
 * @param implementation - The model implementation type
 * @returns The corresponding client class name
 */
export function getClientClass(implementation: ModelImplementation): string {
    return IMPLEMENTATION_MAPPING[implementation];
}