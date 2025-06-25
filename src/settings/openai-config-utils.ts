/**
 * Utility functions for OpenAI configuration management
 * 
 * Provides helper functions to extract, update, and validate OpenAI-specific
 * configurations within the models configuration system.
 */

import { ModelsConfig, ModelConfig } from '../types';
import { validateApiKey } from '../validation/api-key/validateApiKey';
import { ErrorFactory } from '../error-handler';

/**
 * OpenAI API endpoint pattern for identification
 */
const OPENAI_BASE_URL_PATTERN = /^https:\/\/api\.openai\.com\/v1\/?$/;

/**
 * Result of OpenAI configuration extraction
 */
export interface OpenAIConfigExtraction {
    /** Whether any OpenAI configs were found */
    hasOpenAIConfigs: boolean;
    /** Current API key from first OpenAI config (empty string if none found) */
    currentApiKey: string;
    /** List of OpenAI config IDs found */
    configIds: string[];
    /** Count of OpenAI configurations */
    count: number;
}

/**
 * Result of OpenAI API key update operation
 */
export interface OpenAIUpdateResult {
    /** Whether the update was successful */
    success: boolean;
    /** Updated models configuration JSON string */
    updatedModelsConfig: string;
    /** Number of configurations updated */
    updatedCount: number;
    /** List of config IDs that were updated */
    updatedConfigIds: string[];
    /** Error message if update failed */
    error?: string;
}

/**
 * Extract OpenAI configuration information from models config
 * 
 * @param modelsConfigJson - JSON string of models configuration
 * @returns OpenAI configuration extraction result
 */
export function extractOpenAIConfigs(modelsConfigJson: string): OpenAIConfigExtraction {
    const result: OpenAIConfigExtraction = {
        hasOpenAIConfigs: false,
        currentApiKey: '',
        configIds: [],
        count: 0
    };

    if (!modelsConfigJson || modelsConfigJson.trim() === '') {
        return result;
    }

    try {
        const modelsConfig: ModelsConfig = JSON.parse(modelsConfigJson);
        
        if (!modelsConfig || typeof modelsConfig !== 'object') {
            return result;
        }

        // Find all OpenAI configurations
        const openAIConfigIds: string[] = [];
        let firstApiKey = '';

        for (const [configId, config] of Object.entries(modelsConfig)) {
            if (isOpenAIConfig(config)) {
                openAIConfigIds.push(configId);
                
                // Use the first API key found as the current value
                if (!firstApiKey && config.apiKey) {
                    firstApiKey = config.apiKey;
                }
            }
        }

        result.hasOpenAIConfigs = openAIConfigIds.length > 0;
        result.currentApiKey = firstApiKey;
        result.configIds = openAIConfigIds;
        result.count = openAIConfigIds.length;

        return result;
    } catch (error) {
        // Return empty result for parsing errors
        return result;
    }
}

/**
 * Update API keys for all OpenAI configurations
 * 
 * @param modelsConfigJson - Current models configuration JSON string
 * @param newApiKey - New API key to set for all OpenAI configs
 * @returns Update operation result
 */
export function updateOpenAIApiKeys(modelsConfigJson: string, newApiKey: string): OpenAIUpdateResult {
    const result: OpenAIUpdateResult = {
        success: false,
        updatedModelsConfig: modelsConfigJson,
        updatedCount: 0,
        updatedConfigIds: []
    };

    // Validate the new API key first
    try {
        if (newApiKey && newApiKey.trim() !== '') {
            validateApiKey(newApiKey.trim());
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        result.error = `Invalid API key format: ${errorMessage}`;
        return result;
    }

    // Parse the models configuration
    let modelsConfig: ModelsConfig;
    try {
        modelsConfig = JSON.parse(modelsConfigJson);
        
        if (!modelsConfig || typeof modelsConfig !== 'object') {
            result.error = 'Invalid models configuration format';
            return result;
        }
    } catch (error) {
        result.error = 'Failed to parse models configuration JSON';
        return result;
    }

    // Update all OpenAI configurations
    const updatedConfigIds: string[] = [];
    const trimmedApiKey = newApiKey.trim();

    for (const [configId, config] of Object.entries(modelsConfig)) {
        if (isOpenAIConfig(config)) {
            // Update the API key while preserving all other properties
            modelsConfig[configId] = {
                ...config,
                apiKey: trimmedApiKey
            };
            updatedConfigIds.push(configId);
        }
    }

    if (updatedConfigIds.length === 0) {
        result.error = 'No OpenAI configurations found to update';
        return result;
    }

    // Stringify the updated configuration
    try {
        result.updatedModelsConfig = JSON.stringify(modelsConfig, null, 2);
        result.success = true;
        result.updatedCount = updatedConfigIds.length;
        result.updatedConfigIds = updatedConfigIds;
        return result;
    } catch (error) {
        result.error = 'Failed to serialize updated models configuration';
        return result;
    }
}

/**
 * Validate if an API key is in OpenAI format
 * 
 * @param apiKey - API key to validate
 * @returns true if valid OpenAI format, false otherwise
 */
export function isValidOpenAIApiKey(apiKey: string): boolean {
    if (!apiKey || typeof apiKey !== 'string') {
        return false;
    }

    try {
        validateApiKey(apiKey.trim());
        return true;
    } catch (error) {
        return false;
    }
}

/**
 * Get a summary of OpenAI configurations for display
 * 
 * @param modelsConfigJson - JSON string of models configuration
 * @returns Human-readable summary string
 */
export function getOpenAIConfigSummary(modelsConfigJson: string): string {
    const extraction = extractOpenAIConfigs(modelsConfigJson);
    
    if (!extraction.hasOpenAIConfigs) {
        return 'No OpenAI configurations found';
    }

    const hasApiKey = extraction.currentApiKey && extraction.currentApiKey.trim() !== '';
    const keyStatus = hasApiKey ? 'configured' : 'empty';
    
    if (extraction.count === 1) {
        return `1 OpenAI config (API key ${keyStatus})`;
    } else {
        return `${extraction.count} OpenAI configs (API key ${keyStatus})`;
    }
}

/**
 * Check if a model configuration is an OpenAI configuration
 * 
 * @param config - Model configuration to check
 * @returns true if this is an OpenAI configuration
 */
function isOpenAIConfig(config: ModelConfig): boolean {
    if (!config || typeof config !== 'object') {
        return false;
    }

    if (!config.baseUrl || typeof config.baseUrl !== 'string') {
        return false;
    }

    return OPENAI_BASE_URL_PATTERN.test(config.baseUrl.trim());
}

/**
 * Create a safe error message for user display
 * 
 * @param error - Error from API key validation or other operations
 * @returns User-friendly error message
 */
export function createUserFriendlyError(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }
    
    if (typeof error === 'string') {
        return error;
    }
    
    return 'An unexpected error occurred';
}