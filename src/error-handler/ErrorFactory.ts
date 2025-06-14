/**
 * Factory functions for creating specific error types
 */

import { ErrorType } from '../types';
import { AudioInboxError } from './AudioInboxError';

/**
 * Factory functions for creating specific error types
 */
export const ErrorFactory = {
    /**
     * Create a configuration error
     */
    configuration(
        message: string, 
        userMessage: string, 
        context?: any,
        suggestions?: string[]
    ): AudioInboxError {
        return new AudioInboxError(
            ErrorType.CONFIGURATION, 
            message, 
            userMessage,
            context,
            suggestions ?? ['Check your plugin settings', 'Verify your configuration format']
        );
    },

    /**
     * Create a file system error
     */
    fileSystem(
        message: string, 
        userMessage: string, 
        context?: any,
        suggestions?: string[]
    ): AudioInboxError {
        return new AudioInboxError(
            ErrorType.FILE_SYSTEM, 
            message, 
            userMessage,
            context,
            suggestions ?? ['Check file permissions', 'Verify the file path exists']
        );
    },

    /**
     * Create an API error
     */
    api(
        message: string, 
        userMessage: string, 
        context?: any,
        suggestions?: string[]
    ): AudioInboxError {
        return new AudioInboxError(
            ErrorType.API, 
            message, 
            userMessage,
            context,
            suggestions ?? ['Check your API key', 'Verify your internet connection', 'Check API service status']
        );
    },

    /**
     * Create a pipeline error
     */
    pipeline(
        message: string, 
        userMessage: string, 
        context?: any,
        suggestions?: string[]
    ): AudioInboxError {
        return new AudioInboxError(
            ErrorType.PIPELINE, 
            message, 
            userMessage,
            context,
            suggestions ?? ['Check your pipeline configuration', 'Verify all required steps are configured']
        );
    },

    /**
     * Create a validation error
     */
    validation(
        message: string, 
        userMessage: string, 
        context?: any,
        suggestions?: string[]
    ): AudioInboxError {
        return new AudioInboxError(
            ErrorType.VALIDATION, 
            message, 
            userMessage,
            context,
            suggestions ?? ['Check your input data', 'Verify all required fields are present']
        );
    },

    /**
     * Create a parsing error
     */
    parsing(
        message: string, 
        userMessage: string, 
        context?: any,
        suggestions?: string[]
    ): AudioInboxError {
        return new AudioInboxError(
            ErrorType.PARSING, 
            message, 
            userMessage,
            context,
            suggestions ?? ['Check your data format', 'Verify the structure is correct']
        );
    },

    // =============================================================================
    // STEP ROUTING SPECIFIC ERRORS (v1.1)
    // =============================================================================

    /**
     * Create an error for invalid step routing configuration
     */
    stepRouting(
        stepId: string,
        invalidNextStep: string,
        context?: any
    ): AudioInboxError {
        return new AudioInboxError(
            ErrorType.PIPELINE,
            `Invalid next step reference in step ${stepId}: ${invalidNextStep}`,
            `Step "${stepId}" references an invalid next step "${invalidNextStep}"`,
            { stepId, invalidNextStep, ...context },
            [
                'Check that the referenced step exists in your configuration',
                'Verify step ID spelling and case sensitivity',
                'Remove invalid next step references'
            ]
        );
    },

    /**
     * Create an error for invalid routing prompt
     */
    routingPrompt(
        stepId: string,
        nextStepId: string,
        context?: any
    ): AudioInboxError {
        return new AudioInboxError(
            ErrorType.VALIDATION,
            `Invalid routing prompt in step ${stepId} for next step ${nextStepId}`,
            `Step "${stepId}" has an invalid routing prompt for "${nextStepId}"`,
            { stepId, nextStepId, ...context },
            [
                'Provide a descriptive routing prompt',
                'Explain when to route to this step',
                'Use clear criteria for the AI to understand'
            ]
        );
    },

    /**
     * Create an error for malformed next step object
     */
    nextStepFormat(
        stepId: string,
        nextValue: any,
        context?: any
    ): AudioInboxError {
        return new AudioInboxError(
            ErrorType.VALIDATION,
            `Invalid next step format in step ${stepId}`,
            `Step "${stepId}" has an incorrectly formatted "next" field`,
            { stepId, nextValue, expectedFormat: 'object', ...context },
            [
                'Use object format: {"stepId": "routing prompt"}',
                'Remove "next" field if this is the final step',
                'Check JSON syntax and structure'
            ]
        );
    },

    /**
     * Create an error for response parsing when next step is invalid
     */
    invalidResponseNextStep(
        filename: string,
        invalidNextStep: string,
        availableSteps: string[],
        context?: any
    ): AudioInboxError {
        return new AudioInboxError(
            ErrorType.PARSING,
            `Response contains invalid nextStep: ${invalidNextStep}`,
            `File "${filename}" response specified an unknown next step "${invalidNextStep}"`,
            { filename, invalidNextStep, availableSteps, ...context },
            [
                'Check AI response frontmatter for typos',
                `Valid next steps are: ${availableSteps.join(', ')}`,
                'Processing will end for this file'
            ]
        );
    },

    /**
     * Create an error for circular pipeline references
     */
    circularReference(
        circularPath: string[],
        context?: any
    ): AudioInboxError {
        return new AudioInboxError(
            ErrorType.PIPELINE,
            `Circular reference detected in pipeline: ${circularPath.join(' → ')}`,
            'Your pipeline configuration contains a circular reference',
            { circularPath, ...context },
            [
                'Remove circular references from step routing',
                'Ensure pipeline has clear end points',
                'Check step dependencies and routing logic'
            ]
        );
    }
};
