/**
 * Function wrapper utilities for error handling
 */

import { ErrorHandler } from './ErrorHandler';

/**
 * Wrap a function with error handling
 */
export function wrapAsync<T extends (...args: any[]) => Promise<any>>(
    fn: T, 
    context?: string
): T {
    const errorHandler = ErrorHandler.getInstance();
    return (async (...args: Parameters<T>) => {
        try {
            return await fn(...args);
        } catch (error) {
            errorHandler.handleUnknownError(error, { context, args });
            throw error; // Re-throw for caller to handle if needed
        }
    }) as T;
}

/**
 * Wrap a synchronous function with error handling
 */
export function wrapSync<T extends (...args: any[]) => any>(
    fn: T, 
    context?: string
): T {
    const errorHandler = ErrorHandler.getInstance();
    return ((...args: Parameters<T>) => {
        try {
            return fn(...args);
        } catch (error) {
            errorHandler.handleUnknownError(error, { context, args });
            throw error; // Re-throw for caller to handle if needed
        }
    }) as T;
}
