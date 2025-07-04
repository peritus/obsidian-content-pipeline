/**
 * Advanced Validation using Valibot
 * 
 * Pure Valibot-native validation for complete configuration validation.
 * Replaces ConfigurationValidator, ConfigurationResolver, and DirectoryOnlyValidator.
 */

import * as v from 'valibot';
import { ModelsConfig, PipelineConfiguration, isRoutingAwareOutput } from '../types';
import { modelsConfigSchema, pipelineConfigSchema } from './schemas';

// =============================================================================
// CUSTOM VALIDATORS FOR BUSINESS LOGIC
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

// =============================================================================
// UNIFIED VALIDATION SCHEMAS
// =============================================================================

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
// VALIBOT-NATIVE VALIDATION FUNCTIONS
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
 * Validate pipeline configuration with business logic
 */
export function validatePipelineConfig(pipelineConfig: PipelineConfiguration): true {
    v.parse(pipelineConfigAdvanced, pipelineConfig);
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
 * Parse and validate from JSON strings
 */
export function validateConfigFromJson(modelsJson: string, pipelineJson: string): true {
    const modelsConfig = JSON.parse(modelsJson) as ModelsConfig;
    const pipelineConfig = JSON.parse(pipelineJson) as PipelineConfiguration;
    return validateConfig(modelsConfig, pipelineConfig);
}