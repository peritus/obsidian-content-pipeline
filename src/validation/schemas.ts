/**
 * Validation Schemas using Valibot
 * 
 * Centralized validation schemas replacing custom validation code.
 * Provides type-safe, composable validation with consistent error messages.
 */

import * as v from 'valibot';
import { ModelImplementation } from '../types';

/**
 * API Key Validation Schema
 * Supports OpenAI project keys and other generic API key formats
 */
export const apiKeySchema = v.pipe(
    v.string('API key must be a string'),
    v.trim(),
    v.nonEmpty('API key cannot be empty'),
    v.regex(/^[^\s"']+$/, 'API key cannot contain spaces or quotes'),
    v.check((input: string) => {
        // Reject legacy OpenAI format explicitly
        if (/^sk-[a-zA-Z0-9]{48}$/.test(input)) {
            return false;
        }
        
        // Reject common placeholders
        const placeholders = ['your_api_key', 'sk-your-key', 'placeholder', 'replace-with-your-key'];
        if (placeholders.some(placeholder => input.toLowerCase().includes(placeholder))) {
            return false;
        }
        
        // Check minimum length (at least 12 characters for any valid API key)
        if (input.length < 12) {
            return false;
        }
        
        // Check maximum length (reasonable limit)
        if (input.length > 200) {
            return false;
        }
        
        // Must be a valid format: OpenAI project keys, Anthropic keys, or generic format
        const openaiPattern = /^sk-proj-[a-zA-Z0-9]{48}$/;
        const anthropicPattern = /^sk-ant-api03-[a-zA-Z0-9-]{70,}$/;
        const genericPattern = /^[a-zA-Z0-9][a-zA-Z0-9\-_]{11,}$/;
        
        return openaiPattern.test(input) || anthropicPattern.test(input) || genericPattern.test(input);
    }, 'Invalid API key format')
);

/**
 * Path Validation Schema
 * Validates vault-relative paths with security checks
 */
export const pathSchema = v.pipe(
    v.string('Path must be a string'),
    v.trim(),
    v.nonEmpty('Path cannot be empty'),
    v.regex(/^[^\/]/, 'Path cannot be absolute (cannot start with /)'),
    v.regex(/^[^A-Z]:/, 'Path cannot be absolute (cannot start with drive letter)'),
    v.check((input: string) => {
        return !(input.includes('../') || input.includes('..\\'));
    }, 'Path cannot contain parent directory references (..)'),
    v.regex(/^[^<>:"|?*\0]*$/, 'Path contains invalid characters. Allowed: letters, numbers, hyphens, underscores, forward slashes'),
    v.check((input: string) => {
        return !input.includes('//');
    }, 'Path cannot contain double slashes (//)'),
    v.maxLength(260, 'Path is too long (maximum 260 characters)')
);

/**
 * Path Schema with Glob Support
 * Same as pathSchema but allows asterisk (*) characters for glob patterns
 */
export const pathWithGlobsSchema = v.pipe(
    v.string('Path must be a string'),
    v.trim(),
    v.nonEmpty('Path cannot be empty'),
    v.regex(/^[^\/]/, 'Path cannot be absolute (cannot start with /)'),
    v.regex(/^[^A-Z]:/, 'Path cannot be absolute (cannot start with drive letter)'),
    v.check((input: string) => {
        return !(input.includes('../') || input.includes('..\\'));
    }, 'Path cannot contain parent directory references (..)'),
    v.regex(/^[^<>:"|?\0]*$/, 'Path contains invalid characters. Allowed: letters, numbers, hyphens, underscores, forward slashes, asterisks'),
    v.check((input: string) => {
        return !input.includes('//');
    }, 'Path cannot contain double slashes (//)'),
    v.maxLength(260, 'Path is too long (maximum 260 characters)')
);

/**
 * File Pattern Validation Schema
 * Validates file patterns (no template variables supported)
 */
export const filePatternSchema = v.pipe(
    v.string('File pattern must be a string'),
    v.trim(),
    v.nonEmpty('File pattern cannot be empty'),
    v.regex(/^[^\/]/, 'File pattern cannot be absolute'),
    v.regex(/^[^A-Z]:/, 'File pattern cannot be absolute (cannot start with drive letter)'),
    v.check((input: string) => {
        return !(input.includes('../') || input.includes('..\\'));
    }, 'File pattern cannot contain parent directory references (..)'),
    v.regex(/^[^<>:"|?*\{\}\0]*$/, 'File pattern contains invalid characters. Template variables are not supported.'),
    v.check((input: string) => {
        return !input.includes('//');
    }, 'File pattern cannot contain double slashes (//)'),
    v.check((input: string) => {
        return input.endsWith('/');
    }, 'File pattern must end with \'/\' (directory patterns only)'),
    v.maxLength(250, 'File pattern is too long')
);

/**
 * Model Implementation Schema
 */
export const modelImplementationSchema = v.picklist(['whisper', 'chatgpt'], 'Model implementation must be one of: whisper, chatgpt');

/**
 * Model Configuration Schema
 */
export const modelConfigSchema = v.object({
    baseUrl: v.pipe(
        v.string('Base URL must be a string'),
        v.trim(),
        v.nonEmpty('Base URL cannot be empty'),
        v.url('Base URL must be a valid URL')
    ),
    apiKey: apiKeySchema,
    implementation: modelImplementationSchema,
    model: v.pipe(
        v.string('Model must be a string'),
        v.trim(),
        v.nonEmpty('Model cannot be empty')
        // Note: Model validation against implementation will be done at the validator level
    ),
    organization: v.optional(v.string())
});

/**
 * Models Configuration Schema
 */
export const modelsConfigSchema = v.pipe(
    v.record(v.string(), modelConfigSchema),
    v.check((input: Record<string, any>) => {
        const configIds = Object.keys(input);
        
        if (configIds.length === 0) {
            return false;
        }

        if (configIds.length > 50) {
            return false;
        }

        // Validate config ID format
        const configIdPattern = /^[a-z0-9]+([a-z0-9\-_]*[a-z0-9]+)*$/;
        for (const configId of configIds) {
            if (!configIdPattern.test(configId)) {
                return false;
            }
        }

        return true;
    }, 'Models configuration validation failed')
);

/**
 * Step ID Schema
 */
export const stepIdSchema = v.pipe(
    v.string('Step ID must be a string'),
    v.trim(),
    v.nonEmpty('Step ID cannot be empty'),
    v.regex(/^[a-zA-Z][a-zA-Z0-9-]*$/, 'Step ID must start with a letter and contain only letters, numbers, and hyphens')
);

/**
 * Pipeline Step Schema
 */
export const pipelineStepSchema = v.object({
    modelConfig: v.pipe(
        v.string('Model config must be a string'),
        v.trim(),
        v.nonEmpty('Model config cannot be empty'),
        v.regex(/^[a-zA-Z][a-zA-Z0-9-]*$/, 'Invalid model config format')
    ),
    input: v.optional(filePatternSchema),
    output: v.optional(v.union([
        v.string(),
        v.record(v.string(), v.string()) // routing-aware output
    ])),
    archive: v.optional(filePatternSchema),
    prompts: v.optional(v.array(v.string())),
    context: v.optional(v.array(v.string())),
    routingAwareOutput: v.optional(v.record(v.string(), v.string()))
});

/**
 * Pipeline Configuration Schema
 */
export const pipelineConfigSchema = v.pipe(
    v.record(stepIdSchema, pipelineStepSchema),
    v.check((input: Record<string, any>) => {
        const stepIds = Object.keys(input);
        
        if (stepIds.length === 0) {
            return false;
        }

        if (stepIds.length > 20) {
            return false;
        }

        return true;
    }, 'Pipeline configuration validation failed')
);

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

/**
 * Validate API key
 */
export function validateApiKey(apiKey: string): true {
    v.parse(apiKeySchema, apiKey);
    return true;
}

/**
 * Validate file path
 */
export function validatePath(path: string, context: string, allowGlobs: boolean = false): true {
    const schema = allowGlobs ? pathWithGlobsSchema : pathSchema;
    v.parse(schema, path);
    return true;
}

/**
 * Validate file pattern
 */
export function validateFilePattern(pattern: string): true {
    v.parse(filePatternSchema, pattern);
    return true;
}

/**
 * Validate model configuration
 */
export function validateModelConfig(config: any, configId?: string): true {
    v.parse(modelConfigSchema, config);
    return true;
}

/**
 * Validate models configuration
 */
export function validateModelsConfig(config: any): true {
    v.parse(modelsConfigSchema, config);
    return true;
}

/**
 * Validate pipeline step
 */
export function validatePipelineStep(step: any, stepId?: string): true {
    v.parse(pipelineStepSchema, step);
    return true;
}

/**
 * Validate pipeline configuration
 */
export function validatePipelineConfig(config: any): true {
    v.parse(pipelineConfigSchema, config);
    return true;
}

/**
 * Validators object for convenience
 */
export const Validators = {
    path: validatePath,
    apiKey: validateApiKey,
    filePattern: validateFilePattern,
    modelConfig: validateModelConfig,
    modelsConfig: validateModelsConfig,
    pipelineStep: validatePipelineStep,
    pipelineConfig: validatePipelineConfig
};

/**
 * Validate multiple common fields at once
 */
export function validateCommon(data: any): true {
    if (data.path !== undefined) {
        validatePath(data.path, 'common validation');
    }

    if (data.apiKey !== undefined) {
        validateApiKey(data.apiKey);
    }

    if (data.filePattern !== undefined) {
        validateFilePattern(data.filePattern);
    }

    return true;
}
