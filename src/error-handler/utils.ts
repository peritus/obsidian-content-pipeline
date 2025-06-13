/**
 * Utility functions for error handling
 */

import { AudioInboxError } from './AudioInboxError';
import { ErrorFactory } from './ErrorFactory';
import { ErrorHandler } from './ErrorHandler';

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
        
        const errorHandler = ErrorHandler.getInstance();
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
