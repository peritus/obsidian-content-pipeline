/**
 * Central error handler for the plugin
 */

import { ErrorInfo } from '../types';
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
        const errorInfo = error.toErrorInfo();
        
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

    /**
     * Create user-friendly error message based on error type
     */
    createUserFriendlyMessage(errorInfo: ErrorInfo): string {
        const baseMessage = errorInfo.userMessage;
        
        switch (errorInfo.type) {
            case ErrorType.CONFIGURATION:
                return `Configuration Error: ${baseMessage}`;
            case ErrorType.FILE_SYSTEM:
                return `File System Error: ${baseMessage}`;
            case ErrorType.API:
                return `API Error: ${baseMessage}`;
            case ErrorType.PIPELINE:
                return `Pipeline Error: ${baseMessage}`;
            case ErrorType.VALIDATION:
                return `Validation Error: ${baseMessage}`;
            case ErrorType.TEMPLATE:
                return `Template Error: ${baseMessage}`;
            case ErrorType.PARSING:
                return `Parsing Error: ${baseMessage}`;
            default:
                return baseMessage;
        }
    }

    /**
     * Wrap a function with error handling
     */
    wrapAsync<T extends (...args: any[]) => Promise<any>>(
        fn: T, 
        context?: string
    ): T {
        return (async (...args: Parameters<T>) => {
            try {
                return await fn(...args);
            } catch (error) {
                this.handleUnknownError(error, { context, args });
                throw error; // Re-throw for caller to handle if needed
            }
        }) as T;
    }

    /**
     * Wrap a synchronous function with error handling
     */
    wrapSync<T extends (...args: any[]) => any>(
        fn: T, 
        context?: string
    ): T {
        return ((...args: Parameters<T>) => {
            try {
                return fn(...args);
            } catch (error) {
                this.handleUnknownError(error, { context, args });
                throw error; // Re-throw for caller to handle if needed
            }
        }) as T;
    }
}
