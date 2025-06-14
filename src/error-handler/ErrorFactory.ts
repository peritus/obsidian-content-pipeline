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
    }
};
