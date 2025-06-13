/**
 * Validation utilities index
 * 
 * Re-exports all validation functions for convenient importing.
 */

// Core validation functions
export { validatePath } from './path';
export { validateCategory } from './category';
export { validateApiKey } from './api-key/validateApiKey';
export { validateFilePattern } from './file-pattern';
export { validatePipelineStep } from './pipeline-step';
export { validatePipelineConfig } from './pipeline-config';

// Import functions for use in object and convenience function
import { validatePath } from './path';
import { validateCategory } from './category';
import { validateApiKey } from './api-key/validateApiKey';
import { validateFilePattern } from './file-pattern';
import { validatePipelineStep } from './pipeline-step';
import { validatePipelineConfig } from './pipeline-config';

// Convenience object for grouped imports
export const Validators = {
    path: validatePath,
    category: validateCategory,
    apiKey: validateApiKey,
    filePattern: validateFilePattern,
    pipelineStep: validatePipelineStep,
    pipelineConfig: validatePipelineConfig
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
    category?: string;
    apiKey?: string;
    filePattern?: string;
}): true {
    if (data.path) {
        validatePath(data.path, 'provided path');
    }
    
    if (data.category) {
        validateCategory(data.category);
    }
    
    if (data.apiKey) {
        validateApiKey(data.apiKey);
    }
    
    if (data.filePattern) {
        validateFilePattern(data.filePattern);
    }
    
    return true;
}
