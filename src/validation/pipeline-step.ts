/**
 * Pipeline step validation utility (v1.2)
 * 
 * Validates individual pipeline step configurations for the new split configuration schema.
 * Credential validation is handled separately in models-config validation.
 */

import { ErrorFactory } from '../error-handler';
import { PipelineStep } from '../types';
import { validateFilePattern } from './file-pattern';

/**
 * Valid step ID pattern - alphanumeric, hyphens, underscores only
 */
const STEP_ID_PATTERN = /^[a-z0-9]+([a-z0-9\-_]*[a-z0-9]+)*$/;

/**
 * Valid model config ID pattern - alphanumeric, hyphens, underscores only
 */
const CONFIG_ID_PATTERN = /^[a-z0-9]+([a-z0-9\-_]*[a-z0-9]+)*$/;

/**
 * Validate step ID format
 * 
 * @param stepId - The step ID to validate
 * @throws AudioInboxError if invalid format
 */
function validateStepIdFormat(stepId: string): void {
    if (!stepId || typeof stepId !== 'string') {
        throw ErrorFactory.validation(
            `Next step IDs must be non-empty strings`,
            'Step IDs must be non-empty strings',
            { stepId },
            ['Use valid step ID strings', 'Step IDs cannot be empty']
        );
    }

    const trimmed = stepId.trim();
    if (trimmed !== stepId || trimmed.length === 0) {
        throw ErrorFactory.validation(
            `Next step IDs must be non-empty strings`,
            'Next step IDs must be non-empty strings',
            { stepId },
            ['Remove whitespace from step ID', 'Use non-empty strings']
        );
    }

    if (!STEP_ID_PATTERN.test(trimmed)) {
        throw ErrorFactory.validation(
            `invalid step ID format`,
            'Step IDs must contain only lowercase letters, numbers, hyphens, and underscores',
            { stepId, pattern: STEP_ID_PATTERN.source },
            ['Use only lowercase letters, numbers, hyphens, and underscores', 'Start and end with alphanumeric characters', 'Example: "process-tasks", "summary-work"']
        );
    }
}

/**
 * Validate a pipeline step configuration (v1.2)
 * 
 * @param step - The pipeline step to validate
 * @param stepId - The ID of the step (for context in error messages)
 * @returns true if valid
 * @throws AudioInboxError if invalid
 */
export function validatePipelineStep(step: PipelineStep, stepId: string): true {
    if (!step || typeof step !== 'object') {
        throw ErrorFactory.validation(
            `Invalid step configuration for ${stepId} - step configuration missing or invalid`,
            `Pipeline step "${stepId}" configuration is missing or invalid`,
            { stepId, step },
            ['Provide a valid step configuration object', 'Check the JSON syntax']
        );
    }

    // Validate required fields for v1.2 (model credentials removed)
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

    // Validate modelConfig reference
    if (!step.modelConfig || typeof step.modelConfig !== 'string' || step.modelConfig.trim().length === 0) {
        throw ErrorFactory.validation(
            `Invalid modelConfig in step ${stepId} - modelConfig must be a non-empty string`,
            `Pipeline step "${stepId}" modelConfig must be a non-empty string`,
            { stepId, modelConfig: step.modelConfig },
            ['Specify a valid model config ID', 'Reference an existing model configuration']
        );
    }

    const trimmedModelConfig = step.modelConfig.trim();
    if (!CONFIG_ID_PATTERN.test(trimmedModelConfig)) {
        throw ErrorFactory.validation(
            `Invalid modelConfig format in step ${stepId}: ${trimmedModelConfig} - invalid format`,
            `Pipeline step "${stepId}" modelConfig has invalid format`,
            { stepId, modelConfig: trimmedModelConfig },
            ['Use only lowercase letters, numbers, -, and _', 'Start and end with alphanumeric characters', 'Example: "openai-gpt", "anthropic-claude"']
        );
    }

    // Validate input pattern
    try {
        validateFilePattern(step.input);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw ErrorFactory.validation(
            `Invalid input pattern in step ${stepId}: ${errorMessage} - input pattern is invalid`,
            `Pipeline step "${stepId}" input pattern is invalid`,
            { stepId, inputPattern: step.input, originalError: error },
            ['Fix the input pattern', 'Check pattern syntax and variables']
        );
    }

    // Validate output pattern
    try {
        validateFilePattern(step.output);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw ErrorFactory.validation(
            `Invalid output pattern in step ${stepId}: ${errorMessage}`,
            `Pipeline step "${stepId}" output pattern is invalid`,
            { stepId, outputPattern: step.output, originalError: error },
            ['Fix the output pattern', 'Check pattern syntax and variables']
        );
    }

    // Validate archive pattern
    try {
        validateFilePattern(step.archive);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw ErrorFactory.validation(
            `Invalid archive pattern in step ${stepId}: ${errorMessage}`,
            `Pipeline step "${stepId}" archive pattern is invalid`,
            { stepId, archivePattern: step.archive, originalError: error },
            ['Fix the archive pattern', 'Check pattern syntax and variables']
        );
    }

    // Validate include array
    if (!Array.isArray(step.include)) {
        throw ErrorFactory.validation(
            `Invalid include field in step ${stepId} - include field must be an array`,
            `Pipeline step "${stepId}" include field must be an array`,
            { stepId, include: step.include },
            ['Change include to an array', 'Use [] for empty includes', 'Example: ["prompt.md"]']
        );
    }

    // Validate each include path
    step.include.forEach((includePath, index) => {
        if (typeof includePath !== 'string') {
            throw ErrorFactory.validation(
                `Invalid include path in step ${stepId} at index ${index} - include paths must be strings`,
                `Pipeline step "${stepId}" include paths must be strings`,
                { stepId, includePath, index },
                ['Use string paths in include array', 'Remove non-string entries']
            );
        }

        try {
            validateFilePattern(includePath);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw ErrorFactory.validation(
                `Invalid include pattern in step ${stepId} at index ${index}: ${errorMessage}`,
                `Pipeline step "${stepId}" include pattern at index ${index} is invalid`,
                { stepId, includePath, index, originalError: error },
                ['Fix the include pattern', 'Check pattern syntax and variables']
            );
        }
    });

    // Validate optional description
    if (step.description !== undefined) {
        if (typeof step.description !== 'string') {
            throw ErrorFactory.validation(
                `Invalid description in step ${stepId}`,
                `Pipeline step "${stepId}" description must be a string`,
                { stepId, description: step.description },
                ['Provide a valid description string', 'Remove description if not needed']
            );
        }

        if (step.description.trim().length === 0) {
            throw ErrorFactory.validation(
                `Empty description in step ${stepId} - description cannot be empty`,
                `Pipeline step "${stepId}" description cannot be empty`,
                { stepId, description: step.description },
                ['Provide a meaningful description', 'Remove description field if not needed']
            );
        }
    }

    // Validate optional next step configuration (object format)
    if (step.next !== undefined) {
        if (typeof step.next !== 'object' || Array.isArray(step.next) || step.next === null) {
            throw ErrorFactory.validation(
                `next field must be an object mapping step IDs to routing prompts`,
                `Pipeline step "${stepId}" next field must be an object mapping step IDs to routing prompts`,
                { stepId, next: step.next },
                ['Use object format: {"stepId": "routing prompt"}', 'Remove next if this is the final step', 'Example: {"process-tasks": "If work-related content"}']
            );
        }

        // Check for non-string keys in the original object
        const originalKeys = Object.keys(step.next);
        const nonStringKeys = [];
        
        for (const key in step.next) {
            if (step.next.hasOwnProperty(key)) {
                // For runtime detection, we can check common patterns of non-string keys
                if (key === String(Number(key)) && Number.isInteger(Number(key))) {
                    // This looks like it was originally a number
                    nonStringKeys.push(key);
                }
            }
        }

        if (nonStringKeys.length > 0) {
            throw ErrorFactory.validation(
                `Next step IDs must be non-empty strings`,
                `Next step IDs must be non-empty strings`,
                { stepId, nextStepId: nonStringKeys[0] },
                ['Use valid step ID strings', 'Do not use numbers as keys', 'Example: "process-tasks"']
            );
        }

        // Validate each routing entry
        Object.entries(step.next).forEach(([nextStepId, routingPrompt]) => {
            // Validate step ID format
            try {
                validateStepIdFormat(nextStepId);
            } catch (error) {
                // Re-throw the original error message for step ID format issues
                throw error;
            }

            if (typeof routingPrompt !== 'string' || routingPrompt.trim().length === 0) {
                throw ErrorFactory.validation(
                    `Routing prompts must be non-empty strings`,
                    `Routing prompts must be non-empty strings`,
                    { stepId, nextStepId, routingPrompt },
                    ['Provide descriptive routing criteria', 'Explain when to route to this step', 'Example: "If the document contains work-related content"']
                );
            }

            // Validate routing prompt has reasonable length
            if (routingPrompt.trim().length < 10) {
                throw ErrorFactory.validation(
                    `Routing prompt too short in step ${stepId} for next step ${nextStepId}`,
                    `Routing prompts should be descriptive (at least 10 characters)`,
                    { stepId, nextStepId, routingPrompt, length: routingPrompt.trim().length },
                    ['Provide more detailed routing criteria', 'Explain the content type clearly', 'Help the LLM make good routing decisions']
                );
            }
        });

        // Ensure at least one routing option if next is provided
        if (Object.keys(step.next).length === 0) {
            throw ErrorFactory.validation(
                `empty next step configuration`,
                `Pipeline step "${stepId}" next field cannot be empty object`,
                { stepId, next: step.next },
                ['Add at least one routing option', 'Remove next field if not needed', 'Provide meaningful routing choices']
            );
        }
    }

    return true;
}