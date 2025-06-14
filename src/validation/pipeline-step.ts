/**
 * Pipeline step validation utility
 * 
 * Validates individual pipeline step configurations for the new object-keyed schema.
 */

import { ErrorFactory } from '../error-handler';
import { PipelineStep } from '../types';
import { validatePath } from './path';
import { validateApiKey } from './api-key/validateApiKey';
import { validateFilePattern } from './file-pattern';

/**
 * Supported model names for validation
 */
const SUPPORTED_MODELS = [
    // OpenAI models
    'whisper-1',
    'gpt-4',
    'gpt-4-turbo',
    'gpt-4o',
    'gpt-3.5-turbo',
    'gpt-3.5-turbo-16k',
    // Anthropic models  
    'claude-3-opus',
    'claude-3-sonnet',
    'claude-3-haiku',
    'claude-3.5-sonnet'
];

/**
 * Valid URL pattern for base URLs
 */
const URL_PATTERN = /^https?:\/\/[^\s/$.?#].[^\s]*$/;

/**
 * Validate a pipeline step configuration
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

    // Validate required fields (template removed from requirements)
    const requiredFields = ['model', 'input', 'output', 'archive', 'include', 'apiKey'];
    const missingFields = requiredFields.filter(field => !(field in step));
    
    if (missingFields.length > 0) {
        throw ErrorFactory.validation(
            `Missing required fields in step ${stepId}: ${missingFields.join(', ')} - missing required fields`,
            `Pipeline step "${stepId}" is missing required fields: ${missingFields.join(', ')}`,
            { stepId, missingFields, requiredFields },
            ['Add missing fields to step configuration', 'Check the step configuration format']
        );
    }

    // Validate model
    if (!step.model || typeof step.model !== 'string' || step.model.trim().length === 0) {
        throw ErrorFactory.validation(
            `Invalid model in step ${stepId} - model must be a non-empty string`,
            `Pipeline step "${stepId}" model must be a non-empty string`,
            { stepId, model: step.model },
            ['Specify a valid model name', 'Check supported models list']
        );
    }

    const trimmedModel = step.model.trim();
    if (!SUPPORTED_MODELS.includes(trimmedModel)) {
        throw ErrorFactory.validation(
            `Unsupported model in step ${stepId}: ${trimmedModel} - unsupported model`,
            `Pipeline step "${stepId}" uses unsupported model: ${trimmedModel}`,
            { stepId, model: trimmedModel, supportedModels: SUPPORTED_MODELS },
            [
                `Supported models: ${SUPPORTED_MODELS.join(', ')}`,
                'Use a supported model name',
                'Check for typos in model name'
            ]
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

    // Validate API key (always validate if provided, even if empty)
    if (step.apiKey !== undefined) {
        try {
            validateApiKey(step.apiKey);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw ErrorFactory.validation(
                `Invalid API key in step ${stepId}: ${errorMessage} - invalid API key format`,
                `Pipeline step "${stepId}" has invalid API key format`,
                { stepId, originalError: error },
                ['Check API key format', 'Get a valid API key from your provider']
            );
        }
    }

    // Validate optional baseUrl
    if (step.baseUrl) {
        if (typeof step.baseUrl !== 'string') {
            throw ErrorFactory.validation(
                `Invalid baseUrl in step ${stepId}`,
                `Pipeline step "${stepId}" baseUrl must be a string`,
                { stepId, baseUrl: step.baseUrl },
                ['Provide a valid URL string', 'Remove baseUrl if not needed']
            );
        }

        const trimmedUrl = step.baseUrl.trim();
        if (!URL_PATTERN.test(trimmedUrl)) {
            throw ErrorFactory.validation(
                `Invalid baseUrl format in step ${stepId}: ${trimmedUrl} - not a valid URL`,
                `Pipeline step "${stepId}" baseUrl is not a valid URL`,
                { stepId, baseUrl: trimmedUrl },
                ['Use a valid HTTP/HTTPS URL', 'Example: https://api.openai.com/v1', 'Remove if using default endpoint']
            );
        }
    }

    // Validate optional organization
    if (step.organization && typeof step.organization !== 'string') {
        throw ErrorFactory.validation(
            `Invalid organization in step ${stepId}`,
            `Pipeline step "${stepId}" organization must be a string`,
            { stepId, organization: step.organization },
            ['Provide a valid organization string', 'Remove organization if not needed']
        );
    }

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
                `Invalid next step configuration in step ${stepId}`,
                `Pipeline step "${stepId}" next field must be an object mapping step IDs to routing prompts`,
                { stepId, next: step.next },
                ['Use object format: {"stepId": "routing prompt"}', 'Remove next if this is the final step', 'Example: {"process-tasks": "If work-related content"}']
            );
        }

        // Validate each routing entry
        Object.entries(step.next).forEach(([nextStepId, routingPrompt]) => {
            if (typeof nextStepId !== 'string' || nextStepId.trim().length === 0) {
                throw ErrorFactory.validation(
                    `Invalid next step ID in step ${stepId}: ${nextStepId}`,
                    `Next step IDs must be non-empty strings`,
                    { stepId, nextStepId },
                    ['Use valid step ID strings', 'Check for typos', 'Example: "process-tasks"']
                );
            }

            if (typeof routingPrompt !== 'string' || routingPrompt.trim().length === 0) {
                throw ErrorFactory.validation(
                    `Invalid routing prompt in step ${stepId} for next step ${nextStepId}`,
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
                `Empty next step configuration in step ${stepId}`,
                `Pipeline step "${stepId}" next field cannot be empty object`,
                { stepId, next: step.next },
                ['Add at least one routing option', 'Remove next field if not needed', 'Provide meaningful routing choices']
            );
        }
    }

    return true;
}
