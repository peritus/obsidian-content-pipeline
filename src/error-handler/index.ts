/**
 * Error handling framework for Audio Inbox plugin
 * 
 * This framework provides centralized error handling with user notifications,
 * technical logging, and proper error categorization.
 */

// Re-export all components for backwards compatibility
export { AudioInboxError } from './AudioInboxError';
export { NotificationManager } from './NotificationManager';
export { ErrorHandler } from './ErrorHandler';
export { ErrorFactory } from './ErrorFactory';
export { RecoveryStrategies } from './RecoveryStrategies';
export { handleAsync, isAudioInboxError } from './utils';
export { createUserFriendlyMessage } from './error-message-formatter';
export { wrapAsync, wrapSync } from './function-wrappers';

// Import classes to create singleton instances
import { ErrorHandler } from './ErrorHandler';
import { NotificationManager } from './NotificationManager';

// Create singleton instances for easy access
export const errorHandler = ErrorHandler.getInstance();
export const notificationManager = NotificationManager.getInstance();
