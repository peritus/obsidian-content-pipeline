export { ErrorFactory } from './ErrorFactory';
export { ContentPipelineError } from './ContentPipelineError';

// Create ErrorHandler class for backward compatibility
export class ErrorHandler {
    static handle(error: Error): void {
        console.error('Pipeline error:', error);
    }
}

// Create errorHandler instance for backward compatibility
export const errorHandler = new ErrorHandler();
