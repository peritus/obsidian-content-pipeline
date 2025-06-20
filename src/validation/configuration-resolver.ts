/**
 * Configuration resolver for v2.0 routing-aware output system
 * 
 * Handles resolution of pipeline steps to model configurations, provides
 * cross-reference validation, and resolves routing-aware output paths.
 */

import { ErrorFactory } from '../error-handler';
import { 
    ModelsConfig, 
    PipelineConfiguration, 
    ResolvedPipelineStep, 
    ConfigValidationResult, 
    PipelineStep,
    RoutingAwareOutput,
    isRoutingAwareOutput
} from '../types';
import { validateModelsConfig } from './models-config';
import { getClientClass } from './models-config';

/**
 * Configuration resolver for managing dual configuration system with routing-aware outputs
 */
class ConfigurationResolver {
    private modelsConfig: ModelsConfig;
    private pipelineConfig: PipelineConfiguration;

    constructor(modelsConfig: ModelsConfig, pipelineConfig: PipelineConfiguration) {
        this.modelsConfig = modelsConfig;
        this.pipelineConfig = pipelineConfig;
    }

    /**
     * Resolve output path based on routing decision and step configuration
     * 
     * @param step - Pipeline step with output configuration
     * @param nextStep - Optional next step chosen by routing
     * @returns Resolved output path
     * @throws ContentPipelineError if no valid output path can be resolved
     */
    resolveOutputPath(step: PipelineStep, nextStep?: string): string {
        // Handle string output (backward compatibility)
        if (typeof step.output === 'string') {
            return step.output;
        }

        // Handle routing-aware output
        if (isRoutingAwareOutput(step.output)) {
            // Priority 1: Use nextStep if valid
            if (nextStep && step.output[nextStep]) {
                return step.output[nextStep];
            }

            // Priority 2: Use default fallback if available
            if (step.output.default) {
                return step.output.default;
            }

            // Priority 3: No valid path found
            const availableOptions = Object.keys(step.output).filter(key => key !== 'default');
            throw ErrorFactory.routing(
                `No valid output path for routing decision: nextStep="${nextStep || 'undefined'}", no default fallback`,
                'Unable to determine output path for file processing',
                { 
                    nextStep, 
                    availableOptions, 
                    hasDefault: false,
                    outputConfig: step.output
                },
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
     * Resolve a pipeline step to include actual model configuration and routing info
     * 
     * @param stepId - The step ID to resolve
     * @param nextStep - Optional next step for output path resolution
     * @returns Resolved pipeline step with model config and resolved output path
     * @throws ContentPipelineError if step or model config not found
     */
    resolveStep(stepId: string, nextStep?: string): ResolvedPipelineStep {
        // Get pipeline step
        const step = this.pipelineConfig[stepId];
        if (!step) {
            throw ErrorFactory.validation(
                `Pipeline step not found: ${stepId}`,
                `Pipeline step "${stepId}" does not exist`,
                { stepId, availableSteps: Object.keys(this.pipelineConfig) },
                ['Check step ID spelling', 'Use an existing step ID from the pipeline configuration']
            );
        }

        // Get model configuration
        const modelConfig = this.modelsConfig[step.modelConfig];
        if (!modelConfig) {
            throw ErrorFactory.validation(
                `Model config not found: ${step.modelConfig} for step ${stepId}`,
                `Model configuration "${step.modelConfig}" referenced by step "${stepId}" does not exist`,
                { stepId, modelConfigId: step.modelConfig, availableModelConfigs: Object.keys(this.modelsConfig) },
                ['Check model config ID spelling', 'Add the missing model configuration', 'Use an existing model config ID']
            );
        }

        // Resolve output path
        let resolvedOutputPath: string | undefined;
        let routingAwareOutput: RoutingAwareOutput | undefined;

        try {
            resolvedOutputPath = this.resolveOutputPath(step, nextStep);
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
            include: step.include,
            next: step.next,
            description: step.description
        };
    }

    /**
     * Get client class name for a pipeline step
     * 
     * @param stepId - The step ID to get client class for
     * @returns Client class name for the step's model implementation
     * @throws ContentPipelineError if step or model config not found
     */
    getClientClass(stepId: string): string {
        const resolvedStep = this.resolveStep(stepId);
        return getClientClass(resolvedStep.modelConfig.implementation);
    }

    /**
     * Perform comprehensive validation of both configurations and their relationships
     * Updated to include output routing validation
     * 
     * @returns Complete validation result
     */
    validate(): ConfigValidationResult {
        const result: ConfigValidationResult = {
            isValid: true,
            modelsErrors: [],
            pipelineErrors: [],
            crossRefErrors: [],
            outputRoutingErrors: [],
            warnings: [],
            entryPoints: []
        };

        // Validate models configuration
        try {
            validateModelsConfig(this.modelsConfig);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            result.modelsErrors.push(errorMessage);
            result.isValid = false;
        }

        // Validate pipeline configuration (this will fail for missing model references, so we do it separately)
        try {
            // First validate pipeline structure without cross-references
            this.validatePipelineStructure();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            result.pipelineErrors.push(errorMessage);
            result.isValid = false;
        }

        // Perform cross-reference validation
        try {
            this.validateCrossReferences();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            result.crossRefErrors.push(errorMessage);
            result.isValid = false;
        }

        // Perform output routing validation
        try {
            this.validateOutputRouting(result);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            result.outputRoutingErrors.push(errorMessage);
            result.isValid = false;
        }

        // Find entry points if validation passed
        if (result.isValid) {
            try {
                result.entryPoints = this.findEntryPoints();
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                result.pipelineErrors.push(errorMessage);
                result.isValid = false;
            }
        }

        return result;
    }

    /**
     * Validate output routing configuration for all steps
     * 
     * @param result - Validation result to populate with errors
     */
    private validateOutputRouting(result: ConfigValidationResult): void {
        const stepIds = Object.keys(this.pipelineConfig);
        
        stepIds.forEach(stepId => {
            const step = this.pipelineConfig[stepId];
            
            // Get available next steps for this step
            const availableNextSteps = step.next ? Object.keys(step.next) : [];

            // Validate output configuration
            if (typeof step.output === 'string') {
                // String output is always valid (backward compatibility)
                return;
            }

            if (isRoutingAwareOutput(step.output)) {
                // Validate all nextStep options have corresponding output paths
                const outputKeys = Object.keys(step.output);
                const routingKeys = outputKeys.filter(key => key !== 'default');

                const missingOutputPaths = availableNextSteps.filter(nextStep => !outputKeys.includes(nextStep));
                if (missingOutputPaths.length > 0) {
                    result.outputRoutingErrors.push(
                        `Step "${stepId}": Missing output paths for next steps: ${missingOutputPaths.join(', ')}`
                    );
                }

                // Check for unused output paths (warning)
                const unusedOutputPaths = routingKeys.filter(key => !availableNextSteps.includes(key));
                if (unusedOutputPaths.length > 0) {
                    result.warnings.push(
                        `Step "${stepId}": Unused output paths configured: ${unusedOutputPaths.join(', ')}`
                    );
                }

                // Validate path patterns
                for (const [key, path] of Object.entries(step.output)) {
                    if (typeof path !== 'string' || path.trim().length === 0) {
                        result.outputRoutingErrors.push(
                            `Step "${stepId}": Invalid output path for "${key}" - must be non-empty string`
                        );
                    }
                }

                // Recommend default fallback if not present
                if (!step.output.default && availableNextSteps.length > 0) {
                    result.warnings.push(
                        `Step "${stepId}": No default fallback configured - routing failures will cause pipeline errors`
                    );
                }
            } else {
                result.outputRoutingErrors.push(
                    `Step "${stepId}": Invalid output configuration - must be string or routing-aware object`
                );
            }
        });

        // Validate for output path conflicts
        this.validateOutputPathConflicts(result);
    }

    /**
     * Validate for output path conflicts across steps
     * 
     * @param result - Validation result to populate with errors
     */
    private validateOutputPathConflicts(result: ConfigValidationResult): void {
        const pathMapping = new Map<string, string[]>(); // path -> [stepIds]

        Object.entries(this.pipelineConfig).forEach(([stepId, step]) => {
            const outputPaths: string[] = [];

            if (typeof step.output === 'string') {
                outputPaths.push(step.output);
            } else if (isRoutingAwareOutput(step.output)) {
                outputPaths.push(...Object.values(step.output));
            }

            outputPaths.forEach(path => {
                if (!pathMapping.has(path)) {
                    pathMapping.set(path, []);
                }
                pathMapping.get(path)!.push(stepId);
            });
        });

        // Find conflicts
        pathMapping.forEach((stepIds, path) => {
            if (stepIds.length > 1) {
                result.outputRoutingErrors.push(
                    `Output path conflict: "${path}" used by steps: ${stepIds.join(', ')}`
                );
            }
        });
    }

    /**
     * Find entry points in the pipeline configuration
     * 
     * @returns Array of step IDs that are entry points
     */
    findEntryPoints(): string[] {
        const stepIds = Object.keys(this.pipelineConfig);
        const referencedSteps = new Set<string>();

        // Collect all steps that are referenced by other steps
        stepIds.forEach(stepId => {
            const step = this.pipelineConfig[stepId];
            if (step.next) {
                Object.keys(step.next).forEach(nextStepId => {
                    referencedSteps.add(nextStepId);
                });
            }
        });

        // Entry points are steps that are not referenced by any other step
        return stepIds.filter(stepId => !referencedSteps.has(stepId));
    }

    /**
     * Export pipeline configuration without sensitive data
     * 
     * @returns Pipeline configuration safe for sharing
     */
    exportPipelineConfig(): PipelineConfiguration {
        // The pipeline configuration already doesn't contain sensitive data in v1.2
        return { ...this.pipelineConfig };
    }

    /**
     * Validate pipeline structure without cross-reference checks
     * Updated to handle routing-aware output configurations
     * 
     * @throws ContentPipelineError if pipeline structure is invalid
     */
    private validatePipelineStructure(): void {
        if (!this.pipelineConfig || typeof this.pipelineConfig !== 'object') {
            throw ErrorFactory.validation(
                'Invalid pipeline configuration - must be a valid object',
                'Pipeline configuration must be a valid object',
                { config: this.pipelineConfig },
                ['Provide a valid configuration object', 'Check JSON syntax']
            );
        }

        const stepIds = Object.keys(this.pipelineConfig);

        if (stepIds.length === 0) {
            throw ErrorFactory.validation(
                'Empty pipeline configuration - cannot be empty',
                'Pipeline configuration cannot be empty',
                { config: this.pipelineConfig },
                ['Add at least one pipeline step', 'Check the configuration format']
            );
        }

        // Validate each step structure (without model config resolution)
        stepIds.forEach(stepId => {
            const step = this.pipelineConfig[stepId];
            this.validatePipelineStepStructure(step, stepId);
        });

        // Validate step references exist
        stepIds.forEach(stepId => {
            const step = this.pipelineConfig[stepId];
            if (step.next) {
                Object.keys(step.next).forEach(nextStepId => {
                    if (!stepIds.includes(nextStepId)) {
                        throw ErrorFactory.validation(
                            `Invalid step reference: ${stepId} → ${nextStepId} - next step does not exist`,
                            `Step "${stepId}" references non-existent step "${nextStepId}"`,
                            { stepId, nextStepId, availableSteps: stepIds },
                            ['Fix step reference to point to existing step', 'Remove invalid next field', 'Check step ID spelling']
                        );
                    }
                });
            }
        });
    }

    /**
     * Validate cross-references between models and pipeline configurations
     * 
     * @throws ContentPipelineError if cross-references are invalid
     */
    private validateCrossReferences(): void {
        const stepIds = Object.keys(this.pipelineConfig);
        const modelConfigIds = Object.keys(this.modelsConfig);
        const invalidReferences: string[] = [];

        // Check that all modelConfig references exist
        stepIds.forEach(stepId => {
            const step = this.pipelineConfig[stepId];
            if (!modelConfigIds.includes(step.modelConfig)) {
                invalidReferences.push(`${stepId} → ${step.modelConfig}`);
            }
        });

        if (invalidReferences.length > 0) {
            throw ErrorFactory.validation(
                `Invalid model config references: ${invalidReferences.join(', ')} - model configs do not exist`,
                'Some pipeline steps reference non-existent model configurations',
                { invalidReferences, availableModelConfigs: modelConfigIds },
                ['Fix model config references to point to existing configs', 'Add missing model configurations', 'Check model config ID spelling']
            );
        }

        // Check for unused model configurations (warning, not error)
        const usedModelConfigs = new Set(stepIds.map(stepId => this.pipelineConfig[stepId].modelConfig));
        const unusedModelConfigs = modelConfigIds.filter(configId => !usedModelConfigs.has(configId));
        
        if (unusedModelConfigs.length > 0) {
            // This could be added to warnings in the future
            // For now, we don't throw an error for unused configs as they might be intentional
        }
    }

    /**
     * Validate basic pipeline step structure without model resolution
     * Updated to handle routing-aware output configurations
     * 
     * @param step - Pipeline step to validate
     * @param stepId - Step ID for error context
     * @throws ContentPipelineError if step structure is invalid
     */
    private validatePipelineStepStructure(step: PipelineStep, stepId: string): void {
        if (!step || typeof step !== 'object') {
            throw ErrorFactory.validation(
                `Invalid step configuration for ${stepId} - step configuration missing or invalid`,
                `Pipeline step "${stepId}" configuration is missing or invalid`,
                { stepId, step },
                ['Provide a valid step configuration object', 'Check the JSON syntax']
            );
        }

        // Check required fields
        const requiredFields = ['modelConfig', 'input', 'output', 'archive', 'include'];
        const missingFields = requiredFields.filter(field => !(field in step));
        
        if (missingFields.length > 0) {
            throw ErrorFactory.validation(
                `Missing required fields in step ${stepId}: ${missingFields.join(', ')} - missing required fields`,
                `Pipeline step "${stepId}" is missing required fields: ${missingFields.join(', ')}`,
                { stepId, missingFields, requiredFields },
                ['Add missing fields to step configuration', 'Check the step configuration format']
            );
        }

        // Validate modelConfig field is a string
        if (!step.modelConfig || typeof step.modelConfig !== 'string' || step.modelConfig.trim().length === 0) {
            throw ErrorFactory.validation(
                `Invalid modelConfig in step ${stepId} - modelConfig must be a non-empty string`,
                `Pipeline step "${stepId}" modelConfig must be a non-empty string`,
                { stepId, modelConfig: step.modelConfig },
                ['Specify a valid model config ID', 'Reference an existing model configuration']
            );
        }

        // Validate output field (string or routing-aware object)
        if (!step.output) {
            throw ErrorFactory.validation(
                `Missing output field in step ${stepId} - output field is required`,
                `Pipeline step "${stepId}" output field is required`,
                { stepId },
                ['Add output field to step configuration', 'Use string for simple path or object for routing-aware paths']
            );
        }

        if (typeof step.output !== 'string' && !isRoutingAwareOutput(step.output)) {
            throw ErrorFactory.validation(
                `Invalid output field in step ${stepId} - output must be string or routing-aware object`,
                `Pipeline step "${stepId}" output must be string or routing-aware object`,
                { stepId, output: step.output },
                ['Use string for simple output path', 'Use object with nextStep mapping for routing-aware output']
            );
        }

        // Validate include is an array
        if (!Array.isArray(step.include)) {
            throw ErrorFactory.validation(
                `Invalid include field in step ${stepId} - include field must be an array`,
                `Pipeline step "${stepId}" include field must be an array`,
                { stepId, include: step.include },
                ['Change include to an array', 'Use [] for empty includes', 'Example: ["prompt.md"]']
            );
        }
    }
}

/**
 * Create configuration resolver from JSON strings
 * 
 * @param modelsConfigText - JSON string of models configuration
 * @param pipelineConfigText - JSON string of pipeline configuration
 * @returns Configuration resolver instance
 * @throws ContentPipelineError if JSON parsing fails
 */
export function createConfigurationResolver(
    modelsConfigText: string, 
    pipelineConfigText: string
): ConfigurationResolver {
    let modelsConfig: ModelsConfig;
    let pipelineConfig: PipelineConfiguration;

    // Parse models configuration
    try {
        modelsConfig = JSON.parse(modelsConfigText);
    } catch (error) {
        throw ErrorFactory.validation(
            'Invalid models configuration JSON',
            'Models configuration contains invalid JSON syntax',
            { error: error instanceof Error ? error.message : String(error) },
            ['Check JSON syntax in models configuration', 'Validate JSON format', 'Fix parsing errors']
        );
    }

    // Parse pipeline configuration
    try {
        pipelineConfig = JSON.parse(pipelineConfigText);
    } catch (error) {
        throw ErrorFactory.validation(
            'Invalid pipeline configuration JSON',
            'Pipeline configuration contains invalid JSON syntax',
            { error: error instanceof Error ? error.message : String(error) },
            ['Check JSON syntax in pipeline configuration', 'Validate JSON format', 'Fix parsing errors']
        );
    }

    return new ConfigurationResolver(modelsConfig, pipelineConfig);
}
