/**
 * Simplified error handler for the plugin
 */

import { Notice } from 'obsidian';
import { createLogger } from '../logger';
import { AudioInboxError } from './AudioInboxError';

/**
 * Logger for error handling system
 */
const errorLogger = createLogger('ErrorHandler');

/**
 * Simplified central error handler for the plugin
 */
export class ErrorHandler {
    private static instance: ErrorHandler;

    private constructor() {}

    static getInstance(): ErrorHandler {
        if (!ErrorHandler.instance) {
            ErrorHandler.instance = new ErrorHandler();
        }
        return ErrorHandler.instance;
    }

    /**
     * Handle an AudioInboxError
     */
    handleError(error: AudioInboxError): void {
        // Log technical details
        errorLogger.error('AudioInbox error occurred', {
            type: error.type,
            message: error.message,
            context: error.context,
            stack: error.stack
        });

        // Show user-friendly notification - longer timeout for errors
        new Notice(error.userMessage, 6000);
    }

    /**
     * Handle a generic JavaScript error
     */
    handleUnknownError(error: unknown, context?: any): void {
        // Log the error
        errorLogger.error('Unexpected error occurred', { error, context });

        // Show simple user notification
        const message = error instanceof Error ? error.message : String(error);
        new Notice(`Error: ${message}`, 6000);
    }
}
