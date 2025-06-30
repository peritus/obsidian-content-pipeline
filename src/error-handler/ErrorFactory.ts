/**
 * Factory functions for creating specific error types
 */

import { ErrorType } from '../types';
import { ContentPipelineError } from './ContentPipelineError';

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
    ): ContentPipelineError {
        return new ContentPipelineError(
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
    ): ContentPipelineError {
        return new ContentPipelineError(
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
    ): ContentPipelineError {
        return new ContentPipelineError(
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
    ): ContentPipelineError {
        return new ContentPipelineError(
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
    ): ContentPipelineError {
        return new ContentPipelineError(
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
    ): ContentPipelineError {
        return new ContentPipelineError(
            ErrorType.PARSING, 
            message, 
            userMessage,
            context,
            suggestions ?? ['Check your data format', 'Verify the structure is correct']
        );
    },

    /**
     * Create a routing error
     */
    routing(
        message: string, 
        userMessage: string, 
        context?: any,
        suggestions?: string[]
    ): ContentPipelineError {
        return new ContentPipelineError(
            ErrorType.ROUTING, 
            message, 
            userMessage,
            context,
            suggestions ?? ['Check routing configuration', 'Verify output path mappings', 'Add default fallback']
        );
    },

    // =============================================================================
    // ROUTING SPECIFIC ERRORS
    // =============================================================================

    /**
     * Create an error for response parsing when nextStep is invalid
     */
    invalidResponseNextStep(
        filename: string,
        invalidNextStep: string,
        availableSteps: string[],
        context?: any
    ): ContentPipelineError {
        return new ContentPipelineError(
            ErrorType.PARSING,
            `Response contains invalid nextStep: ${invalidNextStep}`,
            `File "${filename}" response specified an unknown routing step "${invalidNextStep}"`,
            { filename, invalidNextStep, availableSteps, ...context },
            [
                'Check AI response frontmatter for typos',
                `Valid routing steps are: ${availableSteps.join(', ')}`,
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
    ): ContentPipelineError {
        return new ContentPipelineError(
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
    },

    // =============================================================================
    // OUTPUT ROUTING SPECIFIC ERRORS
    // =============================================================================

    /**
     * Create an error for invalid routing-aware output configuration
     */
    invalidRoutingOutput(
        stepId: string,
        context?: any
    ): ContentPipelineError {
        return new ContentPipelineError(
            ErrorType.ROUTING,
            `Invalid routing-aware output configuration in step ${stepId}`,
            `Step "${stepId}" has an incorrectly configured routing-aware output`,
            { stepId, ...context },
            [
                'Use object format: {"nextStepId": "path/to/output.md"}',
                'Add "default" fallback path for routing failures',
                'Ensure all routing options have corresponding output paths'
            ]
        );
    },

    /**
     * Create an error when no valid output path can be resolved
     */
    noValidOutputPath(
        stepId: string,
        nextStep: string | undefined,
        availableOptions: string[],
        context?: any
    ): ContentPipelineError {
        return new ContentPipelineError(
            ErrorType.ROUTING,
            `No valid output path for step ${stepId} with nextStep "${nextStep || 'undefined'}"`,
            `Cannot determine where to save the output for step "${stepId}"`,
            { stepId, nextStep, availableOptions, ...context },
            [
                'Add default fallback to output configuration',
                'Ensure AI routing returns valid nextStep option',
                `Valid options are: ${availableOptions.join(', ')}`,
                'Check routing-aware output configuration'
            ]
        );
    },

    /**
     * Create an error for conflicting output paths
     */
    outputPathConflict(
        conflictingPath: string,
        conflictingSteps: string[],
        context?: any
    ): ContentPipelineError {
        return new ContentPipelineError(
            ErrorType.ROUTING,
            `Output path conflict: "${conflictingPath}" used by multiple steps`,
            `Multiple pipeline steps are configured to write to the same location`,
            { conflictingPath, conflictingSteps, ...context },
            [
                'Use unique output paths for each step and routing option',
                'Differentiate paths using variables like {stepId}',
                'Review routing-aware output configuration'
            ]
        );
    }
};