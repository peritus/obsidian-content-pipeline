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
    pipelineConfig: validatePipelineConfig,
    config: validateConfig
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
 * Output path conflict validation: Ensure no duplicate paths
 */
const outputConflictValidator = v.custom<{ models: ModelsConfig; pipeline: PipelineConfiguration }>((input) => {
    const config = input as { models: ModelsConfig; pipeline: PipelineConfiguration };
    const pathMapping = new Map<string, string[]>();

    for (const [stepId, step] of Object.entries(config.pipeline)) {
        const outputPaths: string[] = [];

        if (typeof step.output === 'string') {
            outputPaths.push(step.output);
        } else if (isRoutingAwareOutput(step.output)) {
            outputPaths.push(...Object.values(step.output));
        }

        if (step.archive) {
            outputPaths.push(step.archive);
        }

        outputPaths.forEach(path => {
            if (!pathMapping.has(path)) {
                pathMapping.set(path, []);
            }
            pathMapping.get(path)!.push(stepId);
        });
    }

    // Check for conflicts
    for (const [path, stepIds] of Array.from(pathMapping.entries())) {
        if (stepIds.length > 1) return false;
    }

    return true;
}, 'Output path conflict: same path used by multiple steps');

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
    outputConflictValidator,
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
