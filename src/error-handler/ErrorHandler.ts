/**
 * Central error handler for the plugin
 */

import { createLogger } from '../logger';
import { AudioInboxError } from './AudioInboxError';
import { NotificationManager } from './NotificationManager';
import { ErrorType } from '../types';

/**
 * Logger for error handling system
 */
const errorLogger = createLogger('ErrorHandler');

/**
 * Central error handler for the plugin
 */
export class ErrorHandler {
    private static instance: ErrorHandler;
    private notificationManager: NotificationManager;

    private constructor() {
        this.notificationManager = NotificationManager.getInstance();
    }

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

        // Show user-friendly notification
        const severity = error.getSeverity();
        let userMessage = error.userMessage;

        // Add suggestions if available
        if (error.suggestions && error.suggestions.length > 0) {
            userMessage += '\n\nSuggestions: ' + error.suggestions.join(', ');
        }

        this.notificationManager.notify(severity, userMessage);
    }

    /**
     * Handle a generic JavaScript error
     */
    handleUnknownError(error: unknown, context?: any): void {
        let audioInboxError: AudioInboxError;

        if (error instanceof AudioInboxError) {
            audioInboxError = error;
        } else if (error instanceof Error) {
            audioInboxError = new AudioInboxError(
                ErrorType.PIPELINE,
                error.message,
                'An unexpected error occurred. Please check the console for details.',
                { originalError: error, context },
                ['Check the browser console for technical details', 'Try restarting the plugin']
            );
        } else {
            audioInboxError = new AudioInboxError(
                ErrorType.PIPELINE,
                String(error),
                'An unexpected error occurred. Please check the console for details.',
                { originalError: error, context },
                ['Check the browser console for technical details', 'Try restarting the plugin']
            );
        }

        this.handleError(audioInboxError);
    }
}
