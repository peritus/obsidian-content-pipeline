/**
 * Validation utilities index (v1.2)
 * 
 * Re-exports all validation functions for convenient importing.
 */

// Core validation functions
export { validatePath } from './path';
export { validateApiKey } from './api-key/validateApiKey';
export { validateFilePattern } from './file-pattern';
export { validatePipelineStep } from './pipeline-step';
export { validatePipelineConfig } from './pipeline-config';

// v1.2 Split configuration validation
export { validateModelsConfig, validateModelConfig, getClientClass, IMPLEMENTATION_MAPPING } from './models-config';
export { ConfigurationResolver, createConfigurationResolver } from './configuration-resolver';

// Centralized configuration validation service
export { ConfigurationValidator, createConfigurationValidator } from './configuration-validator';
export type { ConfigurationValidationResult } from './configuration-validator';

// Import functions for use in object and convenience function
import { validatePath } from './path';
import { validateApiKey } from './api-key/validateApiKey';
import { validateFilePattern } from './file-pattern';
import { validatePipelineStep } from './pipeline-step';
import { validatePipelineConfig } from './pipeline-config';
import { validateModelsConfig, validateModelConfig } from './models-config';

// Convenience object for grouped imports
export const Validators = {
    path: validatePath,
    apiKey: validateApiKey,
    filePattern: validateFilePattern,
    pipelineStep: validatePipelineStep,
    pipelineConfig: validatePipelineConfig,
    modelsConfig: validateModelsConfig,
    modelConfig: validateModelConfig
} as const;

/**
 * Validate all common input types with a single function call
 * 
 * @param data - Object containing data to validate
 * @returns true if all validations pass
 * @throws AudioInboxError for any validation failure
 */
export function validateCommon(data: {
    path?: string;
    apiKey?: string;
    filePattern?: string;
}): true {
    if (data.path) {
        validatePath(data.path, 'provided path');
    }
    
    if (data.apiKey) {
        validateApiKey(data.apiKey);
    }
    
    if (data.filePattern) {
        validateFilePattern(data.filePattern);
    }
    
    return true;
}