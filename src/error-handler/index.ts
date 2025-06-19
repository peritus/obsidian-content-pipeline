/**
 * Simplified error handling framework for Audio Inbox plugin
 * 
 * This framework provides centralized error handling with user notifications,
 * technical logging, and proper error categorization.
 */

// Re-export core error handling components
export { AudioInboxError } from './AudioInboxError';
export { ErrorHandler } from './ErrorHandler';
export { ErrorFactory } from './ErrorFactory';

// Import classes to create singleton instances
import { ErrorHandler } from './ErrorHandler';

// Create singleton instances for easy access
export const errorHandler = ErrorHandler.getInstance();