/**
 * Pipeline step validation utility
 * 
 * Validates individual pipeline step configurations.
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

    // Validate required fields
    const requiredFields = ['model', 'input', 'output', 'archive', 'template', 'include', 'apiKey'];
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

    // Validate template path
    try {
        validatePath(step.template, `template path for step ${stepId}`);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw ErrorFactory.validation(
            `Invalid template path in step ${stepId}: ${errorMessage}`,
            `Pipeline step "${stepId}" template path is invalid`,
            { stepId, templatePath: step.template, originalError: error },
            ['Fix the template path', 'Use vault-relative paths only']
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

    // Validate optional next step reference
    if (step.next !== undefined) {
        if (typeof step.next !== 'string') {
            throw ErrorFactory.validation(
                `Invalid next step reference in step ${stepId}`,
                `Pipeline step "${stepId}" next field must be a string`,
                { stepId, next: step.next },
                ['Provide a valid step ID string', 'Remove next if this is the final step']
            );
        }

        const trimmedNext = step.next.trim();
        if (trimmedNext.length === 0) {
            throw ErrorFactory.validation(
                `Empty next step reference in step ${stepId} - next field cannot be empty`,
                `Pipeline step "${stepId}" next field cannot be empty`,
                { stepId, next: step.next },
                ['Provide a valid step ID', 'Remove next field if not needed']
            );
        }
    }

    return true;
}
