/**
 * Configuration Resolution Utilities
 * 
 * Simple utilities for resolving pipeline steps and output paths.
 * Replaces the complex ConfigurationResolver class with pure functions.
 */

import { 
    ModelsConfig, 
    PipelineConfiguration, 
    PipelineStep,
    ResolvedPipelineStep,
    RoutingAwareOutput,
    isRoutingAwareOutput
} from '../types';
import { validateConfig } from './config-validation';
import { ErrorFactory } from '../error-handler';

/**
 * Resolve output path based on routing decision
 */
export function resolveOutputPath(step: PipelineStep, nextStep?: string): string {
    if (typeof step.output === 'string') {
        return step.output;
    }

    if (isRoutingAwareOutput(step.output)) {
        // Try to use the specified next step
        if (nextStep && step.output[nextStep]) {
            return step.output[nextStep];
        }

        // Fall back to default
        if (step.output.default) {
            return step.output.default;
        }

        // No valid path found
        const availableOptions = Object.keys(step.output).filter(key => key !== 'default');
        throw ErrorFactory.routing(
            `No valid output path for routing decision: nextStep="${nextStep || 'undefined'}", no default fallback`,
            'Unable to determine output path for file processing',
            { nextStep, availableOptions, hasDefault: false, outputConfig: step.output },
            [
                'Add default fallback to output configuration',
                'Ensure AI routing returns valid nextStep option',
                'Check available routing options in step configuration'
            ]
        );
    }

    throw ErrorFactory.validation(
        'Invalid output configuration - must be string or routing-aware object',
        'Step output configuration is in invalid format',
        { output: step.output },
        ['Use string for simple output path', 'Use object with nextStep mapping for routing-aware output']
    );
}

/**
 * Resolve a pipeline step to include model configuration
 */
export function resolveStep(
    stepId: string,
    pipelineConfig: PipelineConfiguration,
    modelsConfig: ModelsConfig,
    nextStep?: string
): ResolvedPipelineStep {
    // Validate configurations first
    validateConfig(modelsConfig, pipelineConfig);

    // Get pipeline step
    const step = pipelineConfig[stepId];
    if (!step) {
        throw ErrorFactory.validation(
            `Pipeline step not found: ${stepId}`,
            `Pipeline step "${stepId}" does not exist`,
            { stepId, availableSteps: Object.keys(pipelineConfig) },
            ['Check step ID spelling', 'Use an existing step ID from the pipeline configuration']
        );
    }

    // Get model configuration
    const modelConfig = modelsConfig[step.modelConfig];
    if (!modelConfig) {
        throw ErrorFactory.validation(
            `Model config not found: ${step.modelConfig} for step ${stepId}`,
            `Model configuration "${step.modelConfig}" referenced by step "${stepId}" does not exist`,
            { stepId, modelConfigId: step.modelConfig, availableModelConfigs: Object.keys(modelsConfig) },
            ['Check model config ID spelling', 'Add the missing model configuration', 'Use an existing model config ID']
        );
    }

    // Resolve output path
    let resolvedOutputPath: string | undefined;
    let routingAwareOutput: RoutingAwareOutput | undefined;

    try {
        resolvedOutputPath = resolveOutputPath(step, nextStep);
        if (isRoutingAwareOutput(step.output)) {
            routingAwareOutput = step.output;
        }
    } catch (error) {
        // Allow step resolution without output path resolution for validation purposes
        // The error will be thrown when actually trying to use the output path
    }

    return {
        stepId,
        modelConfig,
        input: step.input,
        output: typeof step.output === 'string' ? step.output : JSON.stringify(step.output),
        resolvedOutputPath,
        routingAwareOutput,
        archive: step.archive,
        prompts: step.prompts || [],
        context: step.context || [],
        description: step.description
    };
}

/**
 * Find entry points in pipeline configuration
 */
export function findEntryPoints(pipelineConfig: PipelineConfiguration): string[] {
    const stepIds = Object.keys(pipelineConfig);
    const referencedSteps = new Set<string>();

    // Collect all steps that are referenced by other steps via routing-aware output
    stepIds.forEach(stepId => {
        const step = pipelineConfig[stepId];
        
        if (step.routingAwareOutput && isRoutingAwareOutput(step.routingAwareOutput)) {
            for (const nextStepId of Object.keys(step.routingAwareOutput)) {
                if (nextStepId !== 'default') {
                    referencedSteps.add(nextStepId);
                }
            }
        }
    });

    // Entry points are steps that are not referenced by any other step AND have input field
    return stepIds.filter(stepId => {
        const step = pipelineConfig[stepId];
        return !referencedSteps.has(stepId) && step.input;
    });
}

/**
 * Get available next steps from routing-aware output
 */
export function getAvailableNextSteps(step: PipelineStep): string[] {
    if (isRoutingAwareOutput(step.output)) {
        return Object.keys(step.output).filter(key => key !== 'default');
    }
    return [];
}

/**
 * Check if step has routing-aware output
 */
export function hasRoutingOutput(step: PipelineStep): boolean {
    return isRoutingAwareOutput(step.output);
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
        throw ErrorFactory.validation(
            'Invalid models configuration JSON',
            'Models configuration contains invalid JSON syntax',
            { error: error instanceof Error ? error.message : String(error) },
            ['Check JSON syntax in models configuration', 'Validate JSON format', 'Fix parsing errors']
        );
    }

    try {
        pipelineConfig = JSON.parse(pipelineJson);
    } catch (error) {
        throw ErrorFactory.validation(
            'Invalid pipeline configuration JSON',
            'Pipeline configuration contains invalid JSON syntax',
            { error: error instanceof Error ? error.message : String(error) },
            ['Check JSON syntax in pipeline configuration', 'Validate JSON format', 'Fix parsing errors']
        );
    }

    // Validate the parsed configurations
    validateConfig(modelsConfig, pipelineConfig);

    return { modelsConfig, pipelineConfig };
}