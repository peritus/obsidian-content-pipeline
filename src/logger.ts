/**
 * Logging system for Content Pipeline plugin
 * 
 * This logging system is controlled entirely at build-time via the
 * OBSIDIAN_CONTENT_PIPELINE_LOGLEVEL environment variable. No runtime
 * configuration is needed or used.
 */

import { LogLevel, LogEntry, LoggerConfig } from './types';

/**
 * Build-time log level configuration
 * This is injected by esbuild and cannot be changed at runtime
 */
declare const process: {
    env: {
        OBSIDIAN_CONTENT_PIPELINE_LOGLEVEL: string;
    };
};

/**
 * Parse log level from build-time environment variable
 */
function getBuildTimeLogLevel(): LogLevel {
    const envLevel = process.env.OBSIDIAN_CONTENT_PIPELINE_LOGLEVEL?.toLowerCase();
    
    switch (envLevel) {
        case 'error': return LogLevel.ERROR;
        case 'warn': return LogLevel.WARN;
        case 'info': return LogLevel.INFO;
        case 'debug': return LogLevel.DEBUG;
        default: return LogLevel.WARN; // Safe default
    }
}

/**
 * Logger configuration determined at build time
 */
const LOGGER_CONFIG: LoggerConfig = {
    level: getBuildTimeLogLevel(),
    includeTimestamp: true,
    includeComponent: true,
    prettyFormat: true
};

/**
 * Log level hierarchy for threshold checking
 */
const LOG_LEVEL_HIERARCHY: Record<LogLevel, number> = {
    [LogLevel.ERROR]: 0,
    [LogLevel.WARN]: 1,
    [LogLevel.INFO]: 2,
    [LogLevel.DEBUG]: 3
};

/**
 * Logger class with build-time configuration
 */
export class Logger {
    private readonly component: string;
    private readonly config: LoggerConfig;

    constructor(component: string) {
        this.component = component;
        this.config = LOGGER_CONFIG;
    }

    /**
     * Check if a log level should be output based on build-time configuration
     */
    private shouldLog(level: LogLevel): boolean {
        const currentLevelValue = LOG_LEVEL_HIERARCHY[this.config.level];
        const messageLevelValue = LOG_LEVEL_HIERARCHY[level];
        return messageLevelValue <= currentLevelValue;
    }

    /**
     * Format log message for output
     */
    private formatMessage(level: LogLevel, message: string, context?: any): string {
        const parts: string[] = [];

        // Timestamp
        if (this.config.includeTimestamp) {
            parts.push(new Date().toISOString());
        }

        // Component
        if (this.config.includeComponent) {
            parts.push(`[${this.component}]`);
        }

        // Level
        parts.push(level.toUpperCase());

        // Message
        parts.push(message);

        let formattedMessage = parts.join(' ');

        // Add context if provided
        if (context !== undefined) {
            if (this.config.prettyFormat && typeof context === 'object') {
                formattedMessage += '\n' + JSON.stringify(context, null, 2);
            } else {
                formattedMessage += ' ' + String(context);
            }
        }

        return formattedMessage;
    }

    /**
     * Create a log entry
     */
    private createLogEntry(level: LogLevel, message: string, context?: any): LogEntry {
        return {
            level,
            component: this.component,
            message,
            context,
            timestamp: new Date()
        };
    }

    /**
     * Log an error message
     */
    public error(message: string, context?: any): void {
        if (this.shouldLog(LogLevel.ERROR)) {
            const formattedMessage = this.formatMessage(LogLevel.ERROR, message, context);
            console.error(formattedMessage);
        }
    }

    /**
     * Log a warning message
     */
    public warn(message: string, context?: any): void {
        if (this.shouldLog(LogLevel.WARN)) {
            const formattedMessage = this.formatMessage(LogLevel.WARN, message, context);
            console.warn(formattedMessage);
        }
    }

    /**
     * Log an info message
     */
    public info(message: string, context?: any): void {
        if (this.shouldLog(LogLevel.INFO)) {
            const formattedMessage = this.formatMessage(LogLevel.INFO, message, context);
            console.log(formattedMessage);
        }
    }

    /**
     * Log a debug message
     */
    public debug(message: string, context?: any): void {
        if (this.shouldLog(LogLevel.DEBUG)) {
            const formattedMessage = this.formatMessage(LogLevel.DEBUG, message, context);
            console.log(formattedMessage);
        }
    }

    /**
     * Log with explicit level
     */
    public log(level: LogLevel, message: string, context?: any): void {
        switch (level) {
            case LogLevel.ERROR:
                this.error(message, context);
                break;
            case LogLevel.WARN:
                this.warn(message, context);
                break;
            case LogLevel.INFO:
                this.info(message, context);
                break;
            case LogLevel.DEBUG:
                this.debug(message, context);
                break;
        }
    }

    /**
     * Get current log level (read-only, set at build time)
     */
    public getLogLevel(): LogLevel {
        return this.config.level;
    }

    /**
     * Check if a specific log level is enabled
     */
    public isLevelEnabled(level: LogLevel): boolean {
        return this.shouldLog(level);
    }

    /**
     * Get logger configuration (read-only, set at build time)
     */
    public getConfig(): Readonly<LoggerConfig> {
        return { ...this.config };
    }

    /**
     * Create a log entry without outputting it (for testing/inspection)
     */
    public createEntry(level: LogLevel, message: string, context?: any): LogEntry | null {
        if (this.shouldLog(level)) {
            return this.createLogEntry(level, message, context);
        }
        return null;
    }
}

/**
 * Create a logger instance for a specific component
 */
export function createLogger(component: string): Logger {
    return new Logger(component);
}

/**
 * Get the current build-time log level
 */
export function getBuildLogLevel(): LogLevel {
    return LOGGER_CONFIG.level;
}