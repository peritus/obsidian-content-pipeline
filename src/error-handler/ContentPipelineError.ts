/**
 * Custom error class for Content Pipeline plugin
 */

import { ErrorType, ErrorInfo, NotificationType } from '../types';

/**
 * Custom error class for Content Pipeline plugin
 */
export class ContentPipelineError extends Error {
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
        this.name = 'ContentPipelineError';
        this.type = type;
        this.userMessage = userMessage;
        this.context = context;
        this.suggestions = suggestions;

        // Maintain proper stack trace for V8
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, ContentPipelineError);
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
            case ErrorType.PARSING:
                return NotificationType.WARNING;
            default:
                return NotificationType.ERROR;
        }
    }
}
