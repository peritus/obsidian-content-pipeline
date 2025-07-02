/**
 * Models configuration validation utility
 * 
 * Re-exports Valibot-based validation for models configuration.
 * Replaces custom validation code with schema-based validation.
 */

import { ModelImplementation } from '../types';

export { validateModelsConfig, validateModelConfig } from './schemas';
export { modelConfigSchema, modelsConfigSchema, modelImplementationSchema } from './schemas';

/**
 * Implementation to client class mapping
 */
const IMPLEMENTATION_MAPPING = {
    whisper: 'WhisperClient',
    chatgpt: 'ChatGPTClient'
} as const;

/**
 * Get client class name for a model implementation
 * 
 * @param implementation - The model implementation type
 * @returns The corresponding client class name
 */
export function getClientClass(implementation: ModelImplementation): string {
    return IMPLEMENTATION_MAPPING[implementation];
}