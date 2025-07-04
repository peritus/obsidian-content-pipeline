/**
 * Complete Validation System using Valibot
 * 
 * Unified validation system replacing all custom validation code.
 * Provides type-safe, composable validation with consistent error messages.
 * 
 * ✅ Replaces: ConfigurationValidator, DirectoryOnlyValidator, ErrorFactory
 * ✅ Consolidates: API key, path, models, pipeline, and configuration validation
 * ✅ Target: ~15KB (down from 87KB original)
 */

import * as v from 'valibot';
import { ModelImplementation, ModelsConfig, PipelineConfiguration, isRoutingAwareOutput } from '../types';
import { CHAT_LIMITS } from '../api/chat-types';
import { WHISPER_LIMITS } from '../api/whisper-types';

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
// API CLIENT VALIDATION SCHEMAS
// =============================================================================

/**
 * Validate supported chat models
 */
function isSupportedChatModel(input: unknown): boolean {
    if (typeof input !== 'string') return false;
    return CHAT_LIMITS.supportedModels.includes(input as any);
}

/**
 * Chat request validation schema
 */
export const chatRequestSchema = v.object({
    yamlRequest: v.pipe(
        v.string('YAML request must be a string'),
        v.trim(),
        v.nonEmpty('YAML request cannot be empty'),
        v.maxLength(CHAT_LIMITS.maxRequestSize, `Request too large (max: ${CHAT_LIMITS.maxRequestSize} bytes)`)
    ),
    model: v.pipe(
        v.string('Model must be a string'),
        v.trim(),
        v.nonEmpty('Model cannot be empty'),
        v.custom(isSupportedChatModel, 'Unsupported model')
    )
});

/**
 * Token count validation schema
 */
export const tokenValidationSchema = v.object({
    yamlRequest: v.string('YAML request must be a string'),
    maxTokens: v.optional(v.number('Max tokens must be a number')),
    estimatedTokens: v.pipe(
        v.number('Estimated tokens must be a number'),
        v.custom((tokens: unknown) => {
            if (typeof tokens !== 'number') return false;
            return tokens <= CHAT_LIMITS.maxTokens * 0.8; // Use 80% of limit as safety margin
        }, 'Request may exceed token limit')
    )
});

/**
 * Validate supported audio file formats
 */
function isSupportedAudioFile(input: unknown): boolean {
    if (typeof input !== 'string') return false;
    const extension = input.toLowerCase().split('.').pop();
    return WHISPER_LIMITS.supportedFormats.includes(extension as any);
}

/**
 * Validate ArrayBuffer
 */
function isArrayBuffer(input: unknown): boolean {
    return input instanceof ArrayBuffer;
}

/**
 * Audio file validation schema
 */
export const audioFileSchema = v.object({
    audioData: v.pipe(
        v.custom(isArrayBuffer, 'Must be ArrayBuffer'),
        v.custom((buffer: unknown) => {
            if (!(buffer instanceof ArrayBuffer)) return false;
            return buffer.byteLength > 0;
        }, 'Audio data cannot be empty'),
        v.custom((buffer: unknown) => {
            if (!(buffer instanceof ArrayBuffer)) return false;
            return buffer.byteLength <= WHISPER_LIMITS.maxFileSize;
        }, `Audio file too large (max: ${WHISPER_LIMITS.maxFileSize} bytes)`)
    ),
    filename: v.pipe(
        v.string('Filename must be a string'),
        v.trim(),
        v.nonEmpty('Filename cannot be empty'),
        v.custom(isSupportedAudioFile, `Unsupported audio format. Supported: ${WHISPER_LIMITS.supportedFormats.join(', ')}`)
    )
});

// =============================================================================
// PATH BUILDER VALIDATION SCHEMAS
// =============================================================================

/**
 * Directory path input validation schema
 * For directory paths that must end with '/' and be vault-relative
 */
export const directoryPathInputSchema = v.pipe(
    v.string('Directory path must be a string'),
    v.trim(),
    v.nonEmpty('Directory path cannot be empty'),
    v.check(path => path.endsWith('/'), 'Directory path must end with "/"'),
    v.check(path => !path.includes('..'), 'Directory path cannot contain path traversal (..)'),
    v.check(path => !path.startsWith('/'), 'Directory path should be vault-relative (no leading /)')
);

/**
 * File path input validation schema
 * For general file paths (input validation)
 */
export const filePathInputSchema = v.pipe(
    v.string('File path must be a string'),
    v.trim(),
    v.nonEmpty('File path cannot be empty')
);

/**
 * Filename input validation schema
 * For standalone filenames
 */
export const filenameInputSchema = v.pipe(
    v.string('Filename must be a string'),
    v.trim(),
    v.nonEmpty('Filename cannot be empty')
);

/**
 * Input pattern validation schema
 * For input patterns used in path resolution
 */
export const inputPatternSchema = v.pipe(
    v.string('Input pattern must be a string'),
    v.trim(),
    v.nonEmpty('Input pattern is required and must be a string')
);

// =============================================================================
// EXECUTION CONTEXT VALIDATION SCHEMAS
// =============================================================================

/**
 * File info validation schema
 * For FileInfo objects used in pipeline execution
 */
export const fileInfoSchema = v.object({
    path: v.pipe(
        v.string('File path must be a string'),
        v.trim(),
        v.nonEmpty('File path cannot be empty')
    ),
    name: v.pipe(
        v.string('File name must be a string'),
        v.trim(),
        v.nonEmpty('File name cannot be empty')
    )
});

/**
 * Model configuration schema for execution
 * For model configs used in pipeline execution
 */
export const executionModelConfigSchema = v.object({
    model: v.pipe(
        v.string('Model must be a string'),
        v.trim(),
        v.nonEmpty('Model cannot be empty')
    ),
    apiKey: v.pipe(
        v.string('API key must be a string'),
        v.trim(),
        v.nonEmpty('API key cannot be empty')
    ),
    baseUrl: v.pipe(
        v.string('Base URL must be a string'),
        v.trim(),
        v.url('Base URL must be valid')
    )
});

/**
 * Resolved pipeline step schema for execution
 * For ResolvedPipelineStep objects used in execution
 */
export const resolvedStepSchema = v.object({
    modelConfig: executionModelConfigSchema,
    prompts: v.optional(v.array(v.string('Prompt must be a string'))),
    context: v.optional(v.array(v.string('Context must be a string')))
});

/**
 * Execution context validation schema
 * For validating complete execution context in ChatStepExecutor
 */
export const executionContextSchema = v.object({
    stepId: v.pipe(
        v.string('Step ID must be a string'),
        v.trim(),
        v.nonEmpty('Step ID cannot be empty')
    ),
    fileInfo: fileInfoSchema,
    resolvedStep: resolvedStepSchema
});

// =============================================================================
// OPENAI CONFIG VALIDATION SCHEMAS
// =============================================================================

/**
 * OpenAI API key validation schema
 * For validating OpenAI API keys specifically
 */
export const openAIApiKeySchema = v.pipe(
    v.string('API key must be a string'),
    v.trim(),
    v.nonEmpty('API key cannot be empty')
);

/**
 * OpenAI configuration validation schema
 * For validating OpenAI model configurations
 */
export const openAIConfigSchema = v.object({
    baseUrl: v.pipe(
        v.string('Base URL must be a string'),
        v.trim(),
        v.nonEmpty('Base URL cannot be empty')
    )
});

/**
 * Models configuration JSON validation schema
 * For validating JSON strings containing models configuration
 */
export const modelsConfigJsonSchema = v.pipe(
    v.string('Models configuration must be a string'),
    v.trim(),
    v.nonEmpty('Models configuration cannot be empty')
);

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

// Simple validation wrapper functions have been removed!
// 
// Instead of: validateApiKey(key)
// Use directly: v.parse(apiKeySchema, key)
//
// Instead of: validatePath(path, 'context')  
// Use directly: v.parse(pathSchema, path)
//
// Instead of: validateChatRequest(yaml, model)
// Use directly: v.parse(chatRequestSchema, { yamlRequest: yaml, model })
//
// This eliminates 20+ wrapper functions and ~4KB of code while providing
// better error messages directly from Valibot.
//
// Only complex validation functions with business logic are kept below.

// =============================================================================
// ADVANCED CONFIGURATION VALIDATION
// =============================================================================

/**
 * Cross-reference validation: Check model config references exist
 */
const crossRefValidator = v.custom<{ models: ModelsConfig; pipeline: PipelineConfiguration }>((input) => {
    const config = input as { models: ModelsConfig; pipeline: PipelineConfiguration };
    const modelConfigIds = Object.keys(config.models);
    const stepIds = Object.keys(config.pipeline);

    for (const stepId of stepIds) {
        const step = config.pipeline[stepId];
        if (!modelConfigIds.includes(step.modelConfig)) {
            return false;
        }
    }
    return true;
}, 'Step references non-existent model config');

/**
 * Circular dependency validation: Detect cycles in routing
 */
const circularDependencyValidator = v.custom<{ models: ModelsConfig; pipeline: PipelineConfiguration }>((input) => {
    const config = input as { models: ModelsConfig; pipeline: PipelineConfiguration };
    const stepIds = Object.keys(config.pipeline);
    const dependencies = new Map<string, Set<string>>();
    
    // Build dependency graph
    for (const stepId of stepIds) {
        dependencies.set(stepId, new Set());
        const step = config.pipeline[stepId];
        
        if (step.routingAwareOutput && isRoutingAwareOutput(step.routingAwareOutput)) {
            for (const nextStepId of Object.keys(step.routingAwareOutput)) {
                if (nextStepId !== 'default' && stepIds.includes(nextStepId)) {
                    dependencies.get(stepId)!.add(nextStepId);
                }
            }
        }
    }

    // Detect cycles using DFS
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    
    function hasCycle(stepId: string): boolean {
        if (recursionStack.has(stepId)) return true;
        if (visited.has(stepId)) return false;
        
        visited.add(stepId);
        recursionStack.add(stepId);
        
        const deps = dependencies.get(stepId) || new Set();
        for (const dep of Array.from(deps)) {
            if (hasCycle(dep)) return true;
        }
        
        recursionStack.delete(stepId);
        return false;
    }
    
    for (const stepId of stepIds) {
        if (hasCycle(stepId)) return false;
    }

    return true;
}, 'Circular dependency detected in routing configuration');

/**
 * Pipeline topology validation: Entry points and orphaned steps
 */
const topologyValidator = v.custom<{ models: ModelsConfig; pipeline: PipelineConfiguration }>((input) => {
    const config = input as { models: ModelsConfig; pipeline: PipelineConfiguration };
    const stepIds = Object.keys(config.pipeline);
    const referencedSteps = new Set<string>();

    // Find referenced steps
    stepIds.forEach(stepId => {
        const step = config.pipeline[stepId];
        if (step.routingAwareOutput && isRoutingAwareOutput(step.routingAwareOutput)) {
            for (const nextStepId of Object.keys(step.routingAwareOutput)) {
                if (nextStepId !== 'default') {
                    referencedSteps.add(nextStepId);
                }
            }
        }
    });

    // Find entry points and orphaned steps
    const entryPoints = stepIds.filter(stepId => {
        const step = config.pipeline[stepId];
        return !referencedSteps.has(stepId) && step.input;
    });

    const orphanedSteps = stepIds.filter(stepId => {
        const step = config.pipeline[stepId];
        return !referencedSteps.has(stepId) && !step.input;
    });

    if (entryPoints.length === 0) return false;
    if (orphanedSteps.length > 0) return false;

    return true;
}, 'Pipeline must have entry points and no orphaned steps');

/**
 * Directory format validation: Ensure directory paths end with /
 */
const directoryFormatValidator = v.custom<{ models: ModelsConfig; pipeline: PipelineConfiguration }>((input) => {
    const config = input as { models: ModelsConfig; pipeline: PipelineConfiguration };
    for (const [stepId, step] of Object.entries(config.pipeline)) {
        // Check output paths
        if (typeof step.output === 'string') {
            if (!step.output.endsWith('/')) return false;
        } else if (isRoutingAwareOutput(step.output)) {
            for (const path of Object.values(step.output)) {
                if (!path.endsWith('/')) return false;
            }
        }

        // Check archive path
        if (step.archive && !step.archive.endsWith('/')) return false;

        // Check for path traversal
        const allPaths = [step.input, step.output, step.archive].filter(Boolean) as string[];
        if (typeof step.output === 'object' && step.output !== null) {
            allPaths.push(...Object.values(step.output));
        }

        for (const path of allPaths) {
            if (path.includes('../') || path.includes('..\\')) return false;
        }
    }
    return true;
}, 'Directory paths must end with / and not contain path traversal');

/**
 * Routing consistency validation: Check routing references are valid
 */
const routingConsistencyValidator = v.custom<{ models: ModelsConfig; pipeline: PipelineConfiguration }>((input) => {
    const config = input as { models: ModelsConfig; pipeline: PipelineConfiguration };
    const stepIds = Object.keys(config.pipeline);

    for (const [stepId, step] of Object.entries(config.pipeline)) {
        if (step.routingAwareOutput && isRoutingAwareOutput(step.routingAwareOutput)) {
            // Check all referenced steps exist
            for (const nextStepId of Object.keys(step.routingAwareOutput)) {
                if (nextStepId !== 'default' && !stepIds.includes(nextStepId)) {
                    return false;
                }
            }

            // Check all paths are valid
            for (const path of Object.values(step.routingAwareOutput)) {
                if (typeof path !== 'string' || path.trim().length === 0) {
                    return false;
                }
            }
        }
    }
    return true;
}, 'Routing configuration must reference valid steps with valid paths');

/**
 * Complete configuration validation schema
 */
export const configSchema = v.pipe(
    v.object({
        models: modelsConfigSchema,
        pipeline: pipelineConfigSchema
    }),
    crossRefValidator,
    circularDependencyValidator,
    topologyValidator,
    directoryFormatValidator,
    routingConsistencyValidator
);

/**
 * Enhanced pipeline configuration schema
 */
export const pipelineConfigAdvanced = v.pipe(
    pipelineConfigSchema,
    v.check((input: PipelineConfiguration) => {
        const stepIds = Object.keys(input);
        return stepIds.length > 0 && stepIds.length <= 20;
    }, 'Pipeline must have 1-20 steps')
);

// =============================================================================
// COMPLETE CONFIGURATION VALIDATION FUNCTIONS
// =============================================================================

/**
 * Validate complete configuration (models + pipeline + business logic)
 */
export function validateConfig(modelsConfig: ModelsConfig, pipelineConfig: PipelineConfiguration): true {
    const input = { models: modelsConfig, pipeline: pipelineConfig };
    v.parse(configSchema, input);
    return true;
}

/**
 * Check if configuration is valid (non-throwing)
 */
export function isValidConfig(modelsConfig: ModelsConfig, pipelineConfig: PipelineConfiguration): boolean {
    try {
        validateConfig(modelsConfig, pipelineConfig);
        return true;
    } catch {
        return false;
    }
}

/**
 * Get validation errors (non-throwing)
 */
export function getConfigErrors(modelsConfig: ModelsConfig, pipelineConfig: PipelineConfiguration): string[] {
    try {
        validateConfig(modelsConfig, pipelineConfig);
        return [];
    } catch (error) {
        if (error instanceof v.ValiError) {
            return error.issues.map(issue => issue.message);
        }
        return [error instanceof Error ? error.message : String(error)];
    }
}

/**
 * Parse configuration from JSON strings with validation
 */
export function parseAndValidateConfig(modelsJson: string, pipelineJson: string): {
    modelsConfig: ModelsConfig;
    pipelineConfig: PipelineConfiguration;
} {
    let modelsConfig: ModelsConfig;
    let pipelineConfig: PipelineConfiguration;

    try {
        modelsConfig = JSON.parse(modelsJson);
    } catch (error) {
        throw new Error(
            `Invalid models configuration JSON: ${error instanceof Error ? error.message : String(error)}`
        );
    }

    try {
        pipelineConfig = JSON.parse(pipelineJson);
    } catch (error) {
        throw new Error(
            `Invalid pipeline configuration JSON: ${error instanceof Error ? error.message : String(error)}`
        );
    }

    // Validate the parsed configurations
    validateConfig(modelsConfig, pipelineConfig);

    return { modelsConfig, pipelineConfig };
}

/**
 * Resolve a pipeline step by combining it with its model configuration
 * 
 * Simple utility function for runtime step resolution.
 * Returns a ResolvedPipelineStep with step + model config combined.
 */
export function resolveStep(
    stepId: string,
    pipelineConfig: PipelineConfiguration,
    modelsConfig: ModelsConfig
): import('../types').ResolvedPipelineStep {
    // Validate configurations first
    validateConfig(modelsConfig, pipelineConfig);

    // Get pipeline step
    const step = pipelineConfig[stepId];
    if (!step) {
        throw new Error(`Pipeline step not found: ${stepId}`);
    }

    // Get model configuration
    const modelConfig = modelsConfig[step.modelConfig];
    if (!modelConfig) {
        throw new Error(`Model config not found: ${step.modelConfig} for step ${stepId}`);
    }

    return {
        stepId,
        modelConfig,
        input: step.input,
        output: typeof step.output === 'string' ? step.output : JSON.stringify(step.output),
        resolvedOutputPath: typeof step.output === 'string' ? step.output : undefined,
        routingAwareOutput: typeof step.output === 'object' ? step.output : undefined,
        archive: step.archive,
        prompts: step.prompts || [],
        context: step.context || [],
        description: step.description
    };
}
