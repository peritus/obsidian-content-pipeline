/**
 * Error handling framework for Audio Inbox plugin
 * 
 * This framework provides centralized error handling with user notifications,
 * technical logging, and proper error categorization.
 */

import { ErrorType, ErrorInfo, NotificationType, NotificationOptions } from './types';
import { createLogger } from './logger';
import { Notice } from 'obsidian';

/**
 * Logger for error handling system
 */
const errorLogger = createLogger('ErrorHandler');

/**
 * Custom error class for Audio Inbox plugin
 */
export class AudioInboxError extends Error {
    public readonly type: ErrorType;
    public readonly context?: any;
    public readonly userMessage: string;
    public readonly suggestions?: string[];

    constructor(
        type: ErrorType, 
        message: string, 
        userMessage: string, 
        context?: any,
        suggestions?: string[]
    ) {
        super(message);
        this.name = 'AudioInboxError';
        this.type = type;
        this.userMessage = userMessage;
        this.context = context;
        this.suggestions = suggestions;

        // Maintain proper stack trace for V8
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, AudioInboxError);
        }
    }

    /**
     * Create ErrorInfo object from this error
     */
    toErrorInfo(): ErrorInfo {
        return {
            type: this.type,
            message: this.message,
            userMessage: this.userMessage,
            context: this.context,
            stack: this.stack,
            suggestions: this.suggestions
        };
    }

    /**
     * Get error severity based on type
     */
    getSeverity(): NotificationType {
        switch (this.type) {
            case ErrorType.CONFIGURATION:
                return NotificationType.ERROR;
            case ErrorType.FILE_SYSTEM:
                return NotificationType.WARNING;
            case ErrorType.API:
                return NotificationType.ERROR;
            case ErrorType.PIPELINE:
                return NotificationType.ERROR;
            case ErrorType.VALIDATION:
                return NotificationType.WARNING;
            case ErrorType.TEMPLATE:
                return NotificationType.WARNING;
            case ErrorType.PARSING:
                return NotificationType.WARNING;
            default:
                return NotificationType.ERROR;
        }
    }
}

/**
 * Notification manager for user-facing messages
 */
export class NotificationManager {
    private static instance: NotificationManager;

    private constructor() {}

    static getInstance(): NotificationManager {
        if (!NotificationManager.instance) {
            NotificationManager.instance = new NotificationManager();
        }
        return NotificationManager.instance;
    }

    /**
     * Show a notification to the user
     */
    notify(type: NotificationType, message: string, options?: NotificationOptions): void {
        const timeout = options?.timeout ?? this.getDefaultTimeout(type);
        
        try {
            new Notice(message, timeout);
            
            errorLogger.debug('Notification shown', {
                type,
                message,
                timeout,
                persistent: options?.persistent
            });
        } catch (error) {
            errorLogger.error('Failed to show notification', {
                originalMessage: message,
                error: error instanceof Error ? error.message : String(error)
            });
            
            // Fallback to console
            console.log(`[AudioInbox] ${type.toUpperCase()}: ${message}`);
        }
    }

    /**
     * Show success notification
     */
    success(message: string, options?: NotificationOptions): void {
        this.notify(NotificationType.SUCCESS, message, options);
    }

    /**
     * Show error notification
     */
    error(message: string, options?: NotificationOptions): void {
        this.notify(NotificationType.ERROR, message, {
            timeout: 8000,
            persistent: false,
            ...options
        });
    }

    /**
     * Show warning notification
     */
    warning(message: string, options?: NotificationOptions): void {
        this.notify(NotificationType.WARNING, message, {
            timeout: 6000,
            ...options
        });
    }

    /**
     * Show info notification
     */
    info(message: string, options?: NotificationOptions): void {
        this.notify(NotificationType.INFO, message, options);
    }

    /**
     * Get default timeout based on notification type
     */
    private getDefaultTimeout(type: NotificationType): number {
        switch (type) {
            case NotificationType.SUCCESS:
                return 4000;
            case NotificationType.ERROR:
                return 8000;
            case NotificationType.WARNING:
                return 6000;
            case NotificationType.INFO:
                return 5000;
            default:
                return 5000;
        }
    }
}

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
     * Create a template error
     */
    template(
        message: string, 
        userMessage: string, 
        context?: any,
        suggestions?: string[]
    ): AudioInboxError {
        return new AudioInboxError(
            ErrorType.TEMPLATE, 
            message, 
            userMessage,
            context,
            suggestions ?? ['Check your template syntax', 'Verify template file exists']
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

/**
 * Global error handler instance
 */
export const errorHandler = ErrorHandler.getInstance();

/**
 * Global notification manager instance
 */
export const notificationManager = NotificationManager.getInstance();

/**
 * Utility function to handle promises with error handling
 * Returns [result, error] tuple where exactly one will be non-null
 */
export async function handleAsync<T>(
    promise: Promise<T>, 
    context?: string
): Promise<[T | undefined, AudioInboxError | undefined]> {
    try {
        const result = await promise;
        return [result, undefined];
    } catch (error) {
        let audioInboxError: AudioInboxError;
        
        if (error instanceof AudioInboxError) {
            audioInboxError = error;
        } else {
            audioInboxError = ErrorFactory.pipeline(
                error instanceof Error ? error.message : String(error),
                'An error occurred during operation',
                { context, originalError: error }
            );
        }
        
        errorHandler.handleError(audioInboxError);
        return [undefined, audioInboxError];
    }
}

/**
 * Type guard to check if an error is an AudioInboxError
 */
export function isAudioInboxError(error: unknown): error is AudioInboxError {
    return error instanceof AudioInboxError;
}

/**
 * Recovery strategies for different error types
 */
export const RecoveryStrategies = {
    /**
     * Attempt to recover from a configuration error
     */
    async configuration(error: AudioInboxError): Promise<boolean> {
        errorLogger.info('Attempting configuration recovery', { error: error.message });
        
        // Could implement automatic config reset, backup restoration, etc.
        // For now, just log the attempt
        return false;
    },

    /**
     * Attempt to recover from a file system error
     */
    async fileSystem(error: AudioInboxError): Promise<boolean> {
        errorLogger.info('Attempting file system recovery', { error: error.message });
        
        // Could implement folder creation, permission fixes, etc.
        // For now, just log the attempt
        return false;
    },

    /**
     * Attempt to recover from an API error
     */
    async api(error: AudioInboxError): Promise<boolean> {
        errorLogger.info('Attempting API recovery', { error: error.message });
        
        // Could implement retry logic, fallback endpoints, etc.
        // For now, just log the attempt
        return false;
    }
};
