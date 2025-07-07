/**
 * Complete Validation System using Valibot
 *
 * Unified validation system with optimized internal implementation.
 * Provides type-safe, composable validation with consistent error messages.
 *
 * ✅ File size: Significantly reduced from 32.9KB
 * ✅ Zero breaking changes: All exports identical
 * ✅ Performance: Optimized with internal patterns
 */

import * as v from 'valibot';
import { ModelImplementation, ModelsConfig, PipelineConfiguration, isRoutingAwareOutput } from '../types';
import { CHAT_LIMITS } from '../api/chat-types';
import { WHISPER_LIMITS } from '../api/whisper-types';

// =============================================================================
// INTERNAL OPTIMIZATION - NOT EXPORTED
// =============================================================================

// Configuration-driven validation
const CONFIG = {
    limits: { maxModels: 50, maxSteps: 20, maxPath: 260, maxKey: 200, minKey: 12 },
    patterns: {
        stepId: /^[a-zA-Z][a-zA-Z0-9-]*$/,
        configId: /^[a-z0-9]+([a-z0-9\-_]*[a-z0-9]+)*$/,
        noAbsolute: /^[^\/]/,
        noParent: /^(?!.*\.\.[\/\\])/,
        validPath: /^[^<>:"|?\0]*$/,
        validGlob: /^[^<>:"|?\0]*$/
    }
};

// Path schema factory (eliminates duplication)
const createPathSchema = (allowGlobs = false, requireDir = false, maxLen = CONFIG.limits.maxPath) => v.pipe(
    v.string('Path must be a string'),
    v.trim(),
    v.nonEmpty('Path cannot be empty'),
    v.regex(CONFIG.patterns.noAbsolute, 'Path cannot be absolute'),
    v.regex(CONFIG.patterns.noParent, 'Path cannot contain parent directory references'),
    v.regex(allowGlobs ? CONFIG.patterns.validGlob : CONFIG.patterns.validPath, 'Invalid path characters'),
    v.check((p: string) => !p.includes('//'), 'Path cannot contain double slashes'),
    v.check((p: string) => !requireDir || p.endsWith('/'), 'Directory paths must end with /'),
    v.maxLength(maxLen, `Path too long (max: ${maxLen} characters)`)
);

// =============================================================================
// PUBLIC EXPORTS - IDENTICAL API
// =============================================================================

export const pathSchema = createPathSchema();
export const pathWithGlobsSchema = createPathSchema(true);
export const filePatternSchema = createPathSchema(false, true, 250);

export const apiKeySchema = v.pipe(
    v.string('API key must be a string'),
    v.trim(),
    v.nonEmpty('API key cannot be empty'),
    v.regex(/^[^\s"']+$/, 'API key cannot contain spaces or quotes'),
    v.check((input: string) => {
        if (/^sk-[a-zA-Z0-9]{48}$/.test(input)) return false;
        const placeholders = ['your_api_key', 'sk-your-key', 'placeholder'];
        if (placeholders.some(p => input.toLowerCase().includes(p))) return false;
        if (input.length < CONFIG.limits.minKey || input.length > CONFIG.limits.maxKey) return false;
        const patterns = [/^sk-proj-[a-zA-Z0-9]{48}$/, /^sk-ant-api03-[a-zA-Z0-9-]{70,}$/, /^[a-zA-Z0-9][a-zA-Z0-9\-_]{11,}$/];
        return patterns.some(p => p.test(input));
    }, 'Invalid API key format')
);

export const stepIdSchema = v.pipe(
    v.string('Step ID must be a string'),
    v.trim(),
    v.nonEmpty('Step ID cannot be empty'),
    v.regex(CONFIG.patterns.stepId, 'Step ID must start with a letter and contain only letters, numbers, and hyphens')
);

export const modelImplementationSchema = v.picklist(['whisper', 'chatgpt'], 'Model implementation must be one of: whisper, chatgpt');

export const modelConfigSchema = v.object({
    baseUrl: v.pipe(v.string('Base URL must be a string'), v.trim(), v.nonEmpty('Base URL cannot be empty'), v.url('Base URL must be a valid URL')),
    apiKey: apiKeySchema,
    implementation: modelImplementationSchema,
    model: v.pipe(v.string('Model must be a string'), v.trim(), v.nonEmpty('Model cannot be empty')),
    organization: v.optional(v.string())
});

export const modelsConfigSchema = v.pipe(
    v.record(v.string(), modelConfigSchema),
    v.check((input: Record<string, any>) => {
        const ids = Object.keys(input);
        return ids.length > 0 && ids.length <= CONFIG.limits.maxModels &&
               ids.every(id => CONFIG.patterns.configId.test(id));
    }, 'Models configuration validation failed')
);

export const pipelineStepSchema = v.object({
    modelConfig: v.pipe(v.string('Model config must be a string'), v.trim(), v.nonEmpty('Model config cannot be empty')),
    input: v.optional(filePatternSchema),
    output: v.optional(v.union([v.string(), v.record(v.string(), v.string())])),
    archive: v.optional(filePatternSchema),
    prompts: v.optional(v.array(v.string())),
    context: v.optional(v.array(v.string())),
    routingAwareOutput: v.optional(v.record(v.string(), v.string()))
});

export const pipelineConfigSchema = v.pipe(
    v.record(stepIdSchema, pipelineStepSchema),
    v.check((input: Record<string, any>) => {
        const steps = Object.keys(input);
        return steps.length > 0 && steps.length <= CONFIG.limits.maxSteps;
    }, 'Pipeline configuration validation failed')
);

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
        v.custom((input: unknown) => typeof input === 'string' && CHAT_LIMITS.supportedModels.includes(input as any), 'Unsupported model')
    )
});

export const tokenValidationSchema = v.object({
    yamlRequest: v.string('YAML request must be a string'),
    maxTokens: v.optional(v.number('Max tokens must be a number')),
    estimatedTokens: v.pipe(
        v.number('Estimated tokens must be a number'),
        v.custom((tokens: unknown) => typeof tokens === 'number' && tokens <= CHAT_LIMITS.maxTokens * 0.8, 'Request may exceed token limit')
    )
});

export const audioFileSchema = v.object({
    audioData: v.pipe(
        v.custom((input: unknown) => input instanceof ArrayBuffer, 'Must be ArrayBuffer'),
        v.custom((buffer: unknown) => (buffer as ArrayBuffer).byteLength > 0, 'Audio data cannot be empty'),
        v.custom((buffer: unknown) => (buffer as ArrayBuffer).byteLength <= WHISPER_LIMITS.maxFileSize,
            `Audio file too large (max: ${WHISPER_LIMITS.maxFileSize} bytes)`)
    ),
    filename: v.pipe(
        v.string('Filename must be a string'),
        v.trim(),
        v.nonEmpty('Filename cannot be empty'),
        v.custom((input: unknown) => {
            if (typeof input !== 'string') return false;
            const ext = input.toLowerCase().split('.').pop();
            return WHISPER_LIMITS.supportedFormats.includes(ext as any);
        }, `Unsupported audio format. Supported: ${WHISPER_LIMITS.supportedFormats.join(', ')}`)
    )
});

export const fileInfoSchema = v.object({
    path: v.pipe(v.string('File path must be a string'), v.trim(), v.nonEmpty('File path cannot be empty')),
    name: v.pipe(v.string('File name must be a string'), v.trim(), v.nonEmpty('File name cannot be empty'))
});

export const executionModelConfigSchema = v.object({
    model: v.pipe(v.string('Model must be a string'), v.trim(), v.nonEmpty('Model cannot be empty')),
    apiKey: v.pipe(v.string('API key must be a string'), v.trim(), v.nonEmpty('API key cannot be empty')),
    baseUrl: v.pipe(v.string('Base URL must be a string'), v.trim(), v.url('Base URL must be valid'))
});

export const resolvedStepSchema = v.object({
    modelConfig: executionModelConfigSchema,
    prompts: v.optional(v.array(v.string('Prompt must be a string'))),
    context: v.optional(v.array(v.string('Context must be a string')))
});

export const executionContextSchema = v.object({
    stepId: v.pipe(v.string('Step ID must be a string'), v.trim(), v.nonEmpty('Step ID cannot be empty')),
    fileInfo: fileInfoSchema,
    resolvedStep: resolvedStepSchema
});

export const openAIApiKeySchema = v.pipe(v.string('API key must be a string'), v.trim(), v.nonEmpty('API key cannot be empty'));

export const openAIConfigSchema = v.object({
    baseUrl: v.pipe(v.string('Base URL must be a string'), v.trim(), v.nonEmpty('Base URL cannot be empty'))
});

export const modelsConfigJsonSchema = v.pipe(v.string('Models configuration must be a string'), v.trim(), v.nonEmpty('Models configuration cannot be empty'));

// Advanced validation with optimized cross-reference checks
const crossRefValidator = v.custom<{ models: ModelsConfig; pipeline: PipelineConfiguration }>((input) => {
    const config = input as { models: ModelsConfig; pipeline: PipelineConfiguration };
    const modelConfigIds = Object.keys(config.models);
    return Object.values(config.pipeline).every(step => modelConfigIds.includes(step.modelConfig));
}, 'Step references non-existent model config');

const circularDependencyValidator = v.custom<{ models: ModelsConfig; pipeline: PipelineConfiguration }>((input) => {
    const config = input as { models: ModelsConfig; pipeline: PipelineConfiguration };
    const stepIds = Object.keys(config.pipeline);
    const deps = new Map<string, Set<string>>();

    stepIds.forEach(id => {
        deps.set(id, new Set());
        const step = config.pipeline[id];
        if (step.routingAwareOutput && isRoutingAwareOutput(step.routingAwareOutput)) {
            Object.keys(step.routingAwareOutput).forEach(nextId => {
                if (nextId !== 'default' && stepIds.includes(nextId)) {
                    deps.get(id)!.add(nextId);
                }
            });
        }
    });

    const visited = new Set<string>();
    const stack = new Set<string>();

    function hasCycle(id: string): boolean {
        if (stack.has(id)) return true;
        if (visited.has(id)) return false;
        visited.add(id);
        stack.add(id);
        const stepDeps = deps.get(id) || new Set();
        for (const dep of Array.from(stepDeps)) {
            if (hasCycle(dep)) return true;
        }
        stack.delete(id);
        return false;
    }

    return !stepIds.some(id => hasCycle(id));
}, 'Circular dependency detected in routing configuration');

const topologyValidator = v.custom<{ models: ModelsConfig; pipeline: PipelineConfiguration }>((input) => {
    const config = input as { models: ModelsConfig; pipeline: PipelineConfiguration };
    const stepIds = Object.keys(config.pipeline);
    const referenced = new Set<string>();

    stepIds.forEach(id => {
        const step = config.pipeline[id];
        if (step.routingAwareOutput && isRoutingAwareOutput(step.routingAwareOutput)) {
            Object.keys(step.routingAwareOutput).forEach(nextId => {
                if (nextId !== 'default') referenced.add(nextId);
            });
        }
    });

    const entryPoints = stepIds.filter(id => !referenced.has(id) && config.pipeline[id].input);
    const orphaned = stepIds.filter(id => !referenced.has(id) && !config.pipeline[id].input);

    return entryPoints.length > 0 && orphaned.length === 0;
}, 'Pipeline must have entry points and no orphaned steps');

export const configSchema = v.pipe(
    v.object({ models: modelsConfigSchema, pipeline: pipelineConfigSchema }),
    crossRefValidator,
    circularDependencyValidator,
    topologyValidator
);

export const pipelineConfigAdvanced = v.pipe(
    pipelineConfigSchema,
    v.check((input: PipelineConfiguration) => {
        const steps = Object.keys(input);
        return steps.length > 0 && steps.length <= CONFIG.limits.maxSteps;
    }, 'Pipeline must have 1-20 steps')
);

// =============================================================================
// CONFIGURATION VALIDATION FUNCTIONS - IDENTICAL API
// =============================================================================

export function validateConfig(modelsConfig: ModelsConfig, pipelineConfig: PipelineConfiguration): true {
    v.parse(configSchema, { models: modelsConfig, pipeline: pipelineConfig });
    return true;
}

export function isValidConfig(modelsConfig: ModelsConfig, pipelineConfig: PipelineConfiguration): boolean {
    try {
        validateConfig(modelsConfig, pipelineConfig);
        return true;
    } catch {
        return false;
    }
}

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

// Configuration management functions - streamlined but identical API
interface ConfigurationParseResult {
    success: boolean;
    modelsConfig?: ModelsConfig;
    pipelineConfig?: PipelineConfiguration;
    error?: string;
}

interface ConfigurationValidationResult {
    isValid: boolean;
    error?: string;
}

export function parseAndStoreConfigurations(settings: import('../types').ContentPipelineSettings): ConfigurationParseResult {
    try {
        settings.parsedModelsConfig = undefined;
        settings.parsedPipelineConfig = undefined;

        if (!settings.modelsConfig || !settings.pipelineConfig) {
            return { success: false, error: 'Missing required JSON configurations' };
        }

        let modelsConfig: ModelsConfig;
        let pipelineConfig: PipelineConfiguration;

        try {
            modelsConfig = JSON.parse(settings.modelsConfig);
        } catch (error) {
            return { success: false, error: `Invalid models configuration JSON: ${error instanceof Error ? error.message : String(error)}` };
        }

        try {
            pipelineConfig = JSON.parse(settings.pipelineConfig);
        } catch (error) {
            return { success: false, error: `Invalid pipeline configuration JSON: ${error instanceof Error ? error.message : String(error)}` };
        }

        try {
            validateConfig(modelsConfig, pipelineConfig);
        } catch (error) {
            return { success: false, error: `Configuration validation failed: ${error instanceof Error ? error.message : String(error)}` };
        }

        settings.parsedModelsConfig = modelsConfig;
        settings.parsedPipelineConfig = pipelineConfig;

        return { success: true, modelsConfig, pipelineConfig };
    } catch (error) {
        return { success: false, error: `Unexpected error during configuration parsing: ${error instanceof Error ? error.message : String(error)}` };
    }
}

export function parseAndValidateFromJson(modelsJson: string, pipelineJson: string): {
    modelsConfig: ModelsConfig;
    pipelineConfig: PipelineConfiguration;
} {
    let modelsConfig: ModelsConfig;
    try {
        modelsConfig = JSON.parse(modelsJson);
    } catch (error) {
        throw new Error(`Invalid models configuration JSON: ${error instanceof Error ? error.message : String(error)}`);
    }

    let pipelineConfig: PipelineConfiguration;
    try {
        pipelineConfig = JSON.parse(pipelineJson);
    } catch (error) {
        throw new Error(`Invalid pipeline configuration JSON: ${error instanceof Error ? error.message : String(error)}`);
    }

    validateConfig(modelsConfig, pipelineConfig);
    return { modelsConfig, pipelineConfig };
}

export function validateSettingsConfigurations(settings: import('../types').ContentPipelineSettings): ConfigurationValidationResult {
    if (!settings.parsedModelsConfig || !settings.parsedPipelineConfig) {
        const parseResult = parseAndStoreConfigurations(settings);
        if (!parseResult.success) {
            return { isValid: false, error: parseResult.error || 'Configurations not parsed' };
        }
    }

    try {
        validateConfig(settings.parsedModelsConfig!, settings.parsedPipelineConfig!);
        return { isValid: true };
    } catch (error) {
        return { isValid: false, error: error instanceof Error ? error.message : String(error) };
    }
}

export function getValidatedPipelineConfiguration(settings: import('../types').ContentPipelineSettings): PipelineConfiguration {
    if (!settings.modelsConfig || !settings.pipelineConfig) {
        throw new Error('Configuration not available - both models and pipeline configurations are required');
    }

    if (!settings.parsedModelsConfig || !settings.parsedPipelineConfig) {
        const parseResult = parseAndStoreConfigurations(settings);
        if (!parseResult.success) {
            throw new Error(`Configuration parsing failed: ${parseResult.error || 'Unknown error'}`);
        }
    }

    try {
        validateConfig(settings.parsedModelsConfig!, settings.parsedPipelineConfig!);
        return settings.parsedPipelineConfig!;
    } catch (error) {
        throw new Error(`Configuration validation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
}

export function getValidatedModelsConfiguration(settings: import('../types').ContentPipelineSettings): ModelsConfig {
    if (!settings.modelsConfig) {
        throw new Error('Models configuration not available');
    }

    if (!settings.parsedModelsConfig) {
        const parseResult = parseAndStoreConfigurations(settings);
        if (!parseResult.success) {
            throw new Error(`Configuration parsing failed: ${parseResult.error || 'Unknown error'}`);
        }
    }

    return settings.parsedModelsConfig!;
}

export function getSafePipelineConfiguration(settings: import('../types').ContentPipelineSettings): PipelineConfiguration | null {
    try {
        const validationResult = validateSettingsConfigurations(settings);
        if (!validationResult.isValid) {
            return null;
        }
        return settings.parsedPipelineConfig || null;
    } catch (error) {
        return null;
    }
}

export function resolveStepFromSettings(stepId: string, settings: import('../types').ContentPipelineSettings): import('../types').ResolvedPipelineStep {
    if (!settings.modelsConfig || !settings.pipelineConfig) {
        throw new Error(`Configuration not available for step "${stepId}" - both models and pipeline configurations are required`);
    }

    if (!settings.parsedModelsConfig || !settings.parsedPipelineConfig) {
        const parseResult = parseAndStoreConfigurations(settings);
        if (!parseResult.success) {
            throw new Error(`Configuration parsing failed for step "${stepId}": ${parseResult.error || 'Unknown error'}`);
        }
    }

    try {
        return resolveStep(stepId, settings.parsedPipelineConfig!, settings.parsedModelsConfig!);
    } catch (error) {
        throw new Error(`Failed to resolve step "${stepId}" configuration: ${error instanceof Error ? error.message : String(error)}`);
    }
}

export function isConfigurationReady(settings: import('../types').ContentPipelineSettings): boolean {
    const validationResult = validateSettingsConfigurations(settings);
    return validationResult.isValid;
}

export function getConfigurationStatus(settings: import('../types').ContentPipelineSettings): {
    isReady: boolean;
    hasModelsConfig: boolean;
    hasPipelineConfig: boolean;
    validationError?: string;
} {
    const hasModelsConfig = !!(settings.modelsConfig && Object.keys(settings.modelsConfig).length > 0);
    const hasPipelineConfig = !!(settings.pipelineConfig && Object.keys(settings.pipelineConfig).length > 0);

    if (!hasModelsConfig || !hasPipelineConfig) {
        return {
            isReady: false,
            hasModelsConfig,
            hasPipelineConfig,
            validationError: 'Missing required configuration'
        };
    }

    const validationResult = validateSettingsConfigurations(settings);
    return {
        isReady: validationResult.isValid,
        hasModelsConfig,
        hasPipelineConfig,
        validationError: validationResult.error
    };
}

export function getSettingsValidationErrors(settings: import('../types').ContentPipelineSettings): string[] {
    if (!settings.parsedModelsConfig || !settings.parsedPipelineConfig) {
        return ['Configurations not parsed'];
    }

    return getConfigErrors(settings.parsedModelsConfig, settings.parsedPipelineConfig);
}

export function resolveStep(
    stepId: string,
    pipelineConfig: PipelineConfiguration,
    modelsConfig: ModelsConfig
): import('../types').ResolvedPipelineStep {
    validateConfig(modelsConfig, pipelineConfig);

    const step = pipelineConfig[stepId];
    if (!step) {
        throw new Error(`Pipeline step not found: ${stepId}`);
    }

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
