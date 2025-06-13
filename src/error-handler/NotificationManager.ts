/**
 * Notification manager for user-facing messages
 */

import { NotificationType, NotificationOptions } from '../types';
import { createLogger } from '../logger';
import { Notice } from 'obsidian';

/**
 * Logger for error handling system
 */
const errorLogger = createLogger('ErrorHandler');

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
