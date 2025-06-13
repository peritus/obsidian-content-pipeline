/**
 * Error message formatting utilities
 */

import { ErrorInfo, ErrorType } from '../types';

/**
 * Create user-friendly error message based on error type
 */
export function createUserFriendlyMessage(errorInfo: ErrorInfo): string {
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
