/**
 * Simple Error System for Content Pipeline Plugin
 *
 * IMPORTANT: This is the ONLY error class for the Content Pipeline plugin.
 *
 * Future developers: DO NOT add more error classes. Keep error handling simple.
 *
 * Valibot validation errors bubble up naturally - don't catch and rethrow them.
 * Only use ContentPipelineError for plugin-specific operations (file I/O, API calls, etc.)
 */

export class ContentPipelineError extends Error {
    /** Optional error that caused this error (for error chaining) */
    public readonly cause?: Error;

    constructor(message: string, cause?: Error) {
        super(message);
        this.name = 'ContentPipelineError';
        this.cause = cause;

        // Maintain proper stack trace for V8
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, ContentPipelineError);
        }
    }
}

/**
 * Type guard to check if an error is a ContentPipelineError
 */
export function isContentPipelineError(error: unknown): error is ContentPipelineError {
    return error instanceof ContentPipelineError;
}

/**
 * Type guard to check if an error is a Valibot validation error
 */
export function isValibotError(error: unknown): error is import('valibot').ValiError<any> {
    return error instanceof Error && 'issues' in error && Array.isArray((error as any).issues);
}

/**
 * Extract a user-friendly error message from any error
 */
export function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }
    return String(error);
}

/**
 * Get detailed message from Valibot error
 */
export function getDetailedValiMessage(error: import('valibot').ValiError<any>): string {
    // Extract the most specific error message from Valibot issues
    return error.issues[0]?.message || error.message;
}
