/**
 * Pipeline configuration validation utility
 * 
 * Validates complete pipeline configurations including structure and relationships.
 */

import { ErrorFactory } from '../error-handler';
import { PipelineConfiguration } from '../types';
import { validatePipelineStep } from './pipeline-step';

/**
 * Validate a complete pipeline configuration
 * 
 * @param config - The pipeline configuration to validate
 * @returns true if valid
 * @throws AudioInboxError if invalid
 */
export function validatePipelineConfig(config: PipelineConfiguration): true {
    if (!config || typeof config !== 'object') {
        throw ErrorFactory.validation(
            'Invalid pipeline configuration',
            'Pipeline configuration must be a valid object',
            { config },
            ['Provide a valid configuration object', 'Check JSON syntax', 'Configuration cannot be null or undefined']
        );
    }

    const stepIds = Object.keys(config);

    // Check if configuration is empty
    if (stepIds.length === 0) {
        throw ErrorFactory.validation(
            'Empty pipeline configuration',
            'Pipeline configuration cannot be empty',
            { config },
            ['Add at least one pipeline step', 'Check the configuration format']
        );
    }

    // Validate each step individually
    stepIds.forEach(stepId => {
        try {
            validatePipelineStep(config[stepId], stepId);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            // Re-throw with pipeline context
            throw ErrorFactory.validation(
                `Pipeline step validation failed: ${errorMessage}`,
                `Step "${stepId}" configuration is invalid`,
                { stepId, step: config[stepId], originalError: error },
                ['Fix the step configuration', 'Check step format and required fields']
            );
        }
    });

    // Validate step ID format
    stepIds.forEach(stepId => {
        if (!stepId || typeof stepId !== 'string') {
            throw ErrorFactory.validation(
                'Invalid step ID',
                'Step IDs must be non-empty strings',
                { stepId },
                ['Use valid string IDs for steps', 'Remove empty or invalid step IDs']
            );
        }

        // Check step ID format (should be reasonable identifiers)
        if (!/^[a-zA-Z][a-zA-Z0-9\-_]*$/.test(stepId)) {
            throw ErrorFactory.validation(
                `Invalid step ID format: ${stepId}`,
                `Step ID "${stepId}" must start with a letter and contain only letters, numbers, hyphens, and underscores`,
                { stepId },
                ['Start step IDs with a letter', 'Use only letters, numbers, -, and _', 'Example: "transcribe", "process"']
            );
        }
    });

    // Check for duplicate step IDs (should not happen in object, but good to be explicit)
    const uniqueStepIds = new Set(stepIds);
    if (uniqueStepIds.size !== stepIds.length) {
        throw ErrorFactory.validation(
            'Duplicate step IDs found',
            'Pipeline configuration contains duplicate step IDs',
            { stepIds, uniqueCount: uniqueStepIds.size },
            ['Ensure all step IDs are unique', 'Check for repeated step names']
        );
    }

    // Validate step references (next fields)
    const invalidReferences: string[] = [];
    stepIds.forEach(stepId => {
        const step = config[stepId];
        if (step.next && !stepIds.includes(step.next)) {
            invalidReferences.push(`${stepId} → ${step.next}`);
        }
    });

    if (invalidReferences.length > 0) {
        throw ErrorFactory.validation(
            `Invalid step references: ${invalidReferences.join(', ')}`,
            'Some steps reference non-existent next steps',
            { invalidReferences, availableSteps: stepIds },
            ['Fix step references to point to existing steps', 'Remove invalid next fields', 'Check step ID spelling']
        );
    }

    // Detect circular references
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    
    function hasCircularReference(stepId: string): boolean {
        if (recursionStack.has(stepId)) {
            return true; // Circular reference detected
        }
        
        if (visited.has(stepId)) {
            return false; // Already processed this path
        }

        visited.add(stepId);
        recursionStack.add(stepId);

        const step = config[stepId];
        if (step.next && hasCircularReference(step.next)) {
            return true;
        }

        recursionStack.delete(stepId);
        return false;
    }

    const circularSteps: string[] = [];
    stepIds.forEach(stepId => {
        if (!visited.has(stepId) && hasCircularReference(stepId)) {
            circularSteps.push(stepId);
        }
    });

    if (circularSteps.length > 0) {
        throw ErrorFactory.validation(
            `Circular references detected in steps: ${circularSteps.join(', ')}`,
            'Pipeline configuration contains circular references between steps',
            { circularSteps, allSteps: stepIds },
            ['Remove circular references', 'Check next step chains', 'Ensure linear pipeline flow']
        );
    }

    // Find entry points (steps not referenced by any other step)
    const referencedSteps = new Set<string>();
    stepIds.forEach(stepId => {
        const step = config[stepId];
        if (step.next) {
            referencedSteps.add(step.next);
        }
    });

    const entryPoints = stepIds.filter(stepId => !referencedSteps.has(stepId));

    if (entryPoints.length === 0) {
        throw ErrorFactory.validation(
            'No entry points found in pipeline',
            'Pipeline configuration has no entry points (all steps are referenced by other steps)',
            { allSteps: stepIds, referencedSteps: Array.from(referencedSteps) },
            ['Ensure at least one step is not referenced by others', 'Check for circular references', 'Add a starting step']
        );
    }

    // Find orphaned steps (steps that cannot be reached from entry points)
    const reachableSteps = new Set<string>();
    
    function markReachableSteps(stepId: string) {
        if (reachableSteps.has(stepId)) {
            return; // Already processed
        }
        
        reachableSteps.add(stepId);
        const step = config[stepId];
        if (step.next) {
            markReachableSteps(step.next);
        }
    }

    entryPoints.forEach(entryPoint => {
        markReachableSteps(entryPoint);
    });

    const orphanedSteps = stepIds.filter(stepId => !reachableSteps.has(stepId));
    
    if (orphanedSteps.length > 0) {
        throw ErrorFactory.validation(
            `Orphaned steps found: ${orphanedSteps.join(', ')}`,
            'Some steps cannot be reached from any entry point',
            { orphanedSteps, entryPoints, reachableSteps: Array.from(reachableSteps) },
            ['Connect orphaned steps to the main pipeline', 'Remove unused steps', 'Check step references']
        );
    }

    // Validate that at least one step accepts audio input (for audio processing pipeline)
    const audioInputSteps = stepIds.filter(stepId => {
        const step = config[stepId];
        return step.input.includes('audio') || step.model === 'whisper-1';
    });

    if (audioInputSteps.length === 0) {
        throw ErrorFactory.validation(
            'No audio input steps found',
            'Pipeline should have at least one step that processes audio files',
            { allSteps: stepIds },
            ['Add a step with audio input pattern', 'Use whisper-1 model for audio transcription', 'Check input patterns']
        );
    }

    // Additional validation: check for reasonable pipeline structure
    if (stepIds.length > 20) {
        throw ErrorFactory.validation(
            `Too many pipeline steps: ${stepIds.length}`,
            'Pipeline has too many steps (maximum 20 recommended)',
            { stepCount: stepIds.length },
            ['Reduce number of steps', 'Combine similar processing steps', 'Simplify pipeline structure']
        );
    }

    return true;
}
