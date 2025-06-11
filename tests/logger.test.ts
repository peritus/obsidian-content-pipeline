/**
 * Logger System Tests
 * 
 * Test suite for the logging framework.
 */

import { createLogger, getBuildLogLevel, Logger } from '../src/logger';
import { LogLevel } from '../src/types';
import { cleanup } from './setup';

// Mock console methods for testing
const originalConsole = global.console;

describe('Logger', () => {
    let mockConsole: any;

    beforeEach(() => {
        mockConsole = {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            info: jest.fn(),
            debug: jest.fn()
        };
        global.console = mockConsole;
    });

    afterEach(() => {
        global.console = originalConsole;
        cleanup();
    });

    describe('createLogger', () => {
        it('should create logger instances', () => {
            const logger = createLogger('Test');
            expect(logger).toBeInstanceOf(Logger);
        });

        it('should create loggers with different components', () => {
            const logger1 = createLogger('Component1');
            const logger2 = createLogger('Component2');
            
            expect(logger1).not.toBe(logger2);
        });
    });

    describe('log level hierarchy', () => {
        it('should respect log level hierarchy', () => {
            const logger = createLogger('Test');
            
            // Test that shouldLog respects hierarchy
            expect(logger.shouldLog(LogLevel.ERROR)).toBe(true); // ERROR always logs
            
            // The exact behavior depends on build-time log level
            const buildLevel = getBuildLogLevel();
            if (buildLevel === LogLevel.DEBUG) {
                expect(logger.shouldLog(LogLevel.DEBUG)).toBe(true);
                expect(logger.shouldLog(LogLevel.INFO)).toBe(true);
                expect(logger.shouldLog(LogLevel.WARN)).toBe(true);
                expect(logger.shouldLog(LogLevel.ERROR)).toBe(true);
            }
        });
    });

    describe('logging methods', () => {
        let logger: Logger;

        beforeEach(() => {
            logger = createLogger('TestComponent');
        });

        it('should log error messages', () => {
            logger.error('Test error message');
            
            if (logger.shouldLog(LogLevel.ERROR)) {
                expect(mockConsole.error).toHaveBeenCalledWith(
                    expect.stringContaining('ERROR')
                );
                expect(mockConsole.error).toHaveBeenCalledWith(
                    expect.stringContaining('Test error message')
                );
            }
        });

        it('should log warning messages', () => {
            logger.warn('Test warning message');
            
            if (logger.shouldLog(LogLevel.WARN)) {
                expect(mockConsole.warn).toHaveBeenCalledWith(
                    expect.stringContaining('WARN')
                );
            }
        });

        it('should log info messages', () => {
            logger.info('Test info message');
            
            if (logger.shouldLog(LogLevel.INFO)) {
                expect(mockConsole.log).toHaveBeenCalledWith(
                    expect.stringContaining('INFO')
                );
            }
        });

        it('should log debug messages', () => {
            logger.debug('Test debug message');
            
            if (logger.shouldLog(LogLevel.DEBUG)) {
                expect(mockConsole.log).toHaveBeenCalledWith(
                    expect.stringContaining('DEBUG')
                );
            }
        });

        it('should include component name in logs', () => {
            logger.info('Test message');
            
            if (logger.shouldLog(LogLevel.INFO)) {
                expect(mockConsole.log).toHaveBeenCalledWith(
                    expect.stringContaining('[TestComponent]')
                );
            }
        });

        it('should include timestamp in logs', () => {
            logger.info('Test message');
            
            if (logger.shouldLog(LogLevel.INFO)) {
                expect(mockConsole.log).toHaveBeenCalledWith(
                    expect.stringMatching(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/)
                );
            }
        });

        it('should format context objects', () => {
            const context = { key: 'value', number: 42 };
            logger.info('Test message', context);
            
            if (logger.shouldLog(LogLevel.INFO)) {
                const calls = mockConsole.log.mock.calls;
                const lastCall = calls[calls.length - 1];
                expect(lastCall[0]).toContain('Test message');
                expect(lastCall[0]).toContain('"key": "value"');
                expect(lastCall[0]).toContain('"number": 42');
            }
        });

        it('should handle primitive context values', () => {
            logger.info('Test message', 'string context');
            
            if (logger.shouldLog(LogLevel.INFO)) {
                expect(mockConsole.log).toHaveBeenCalledWith(
                    expect.stringContaining('string context')
                );
            }
        });
    });

    describe('log method with explicit level', () => {
        it('should log with explicit level', () => {
            const logger = createLogger('Test');
            
            logger.log(LogLevel.ERROR, 'Explicit error');
            
            if (logger.shouldLog(LogLevel.ERROR)) {
                expect(mockConsole.error).toHaveBeenCalledWith(
                    expect.stringContaining('ERROR')
                );
            }
        });
    });

    describe('logger configuration', () => {
        it('should provide readonly configuration', () => {
            const logger = createLogger('Test');
            const config = logger.getConfig();
            
            expect(config).toHaveProperty('level');
            expect(config).toHaveProperty('includeTimestamp');
            expect(config).toHaveProperty('includeComponent');
            expect(config).toHaveProperty('prettyFormat');
            
            // Should be a copy, not the original
            expect(config).not.toBe((logger as any).config);
        });

        it('should provide current log level', () => {
            const logger = createLogger('Test');
            const level = logger.getLogLevel();
            
            expect(Object.values(LogLevel)).toContain(level);
        });

        it('should check if levels are enabled', () => {
            const logger = createLogger('Test');
            
            // ERROR should always be enabled
            expect(logger.isLevelEnabled(LogLevel.ERROR)).toBe(true);
            
            // Others depend on build configuration
            const buildLevel = getBuildLogLevel();
            if (buildLevel === LogLevel.DEBUG) {
                expect(logger.isLevelEnabled(LogLevel.DEBUG)).toBe(true);
            }
        });
    });

    describe('createEntry method', () => {
        it('should create log entries without outputting', () => {
            const logger = createLogger('Test');
            
            const entry = logger.createEntry(LogLevel.ERROR, 'Test message', { test: true });
            
            if (logger.shouldLog(LogLevel.ERROR)) {
                expect(entry).toEqual({
                    level: LogLevel.ERROR,
                    component: 'Test',
                    message: 'Test message',
                    context: { test: true },
                    timestamp: expect.any(Date)
                });
            } else {
                expect(entry).toBeNull();
            }
            
            // Should not have logged anything
            expect(mockConsole.error).not.toHaveBeenCalled();
        });
    });

    describe('message formatting', () => {
        it('should format messages correctly', () => {
            const logger = createLogger('TestComponent');
            
            // Use the internal formatMessage method
            const formatted = (logger as any).formatMessage(
                LogLevel.INFO,
                'Test message',
                { key: 'value' }
            );
            
            expect(formatted).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/); // timestamp
            expect(formatted).toContain('[TestComponent]'); // component
            expect(formatted).toContain('INFO'); // level
            expect(formatted).toContain('Test message'); // message
            expect(formatted).toContain('"key": "value"'); // context
        });

        it('should handle messages without context', () => {
            const logger = createLogger('Test');
            
            const formatted = (logger as any).formatMessage(LogLevel.INFO, 'Test message');
            
            expect(formatted).toContain('Test message');
            expect(formatted).not.toContain('undefined');
        });
    });
});

describe('getBuildLogLevel', () => {
    it('should return a valid log level', () => {
        const buildLevel = getBuildLogLevel();
        expect(Object.values(LogLevel)).toContain(buildLevel);
    });

    it('should match environment configuration', () => {
        // The build log level is set at build time
        // For tests, it should be controlled by the test environment
        const buildLevel = getBuildLogLevel();
        expect(typeof buildLevel).toBe('string');
        expect(buildLevel.length).toBeGreaterThan(0);
    });
});

describe('Logger Integration', () => {
    afterEach(() => {
        cleanup();
    });

    it('should work with error handling system', () => {
        // This is more of an integration test
        const logger = createLogger('ErrorTest');
        
        // Should not throw when logging
        expect(() => {
            logger.error('Test error');
            logger.warn('Test warning');
            logger.info('Test info');
            logger.debug('Test debug');
        }).not.toThrow();
    });

    it('should handle circular references in context', () => {
        const logger = createLogger('CircularTest');
        
        // Create circular reference
        const obj: any = { name: 'test' };
        obj.self = obj;
        
        // Should not throw due to circular reference
        expect(() => {
            logger.info('Test with circular reference', obj);
        }).not.toThrow();
    });

    it('should handle very large context objects', () => {
        const logger = createLogger('LargeContextTest');
        
        const largeContext = {
            data: new Array(1000).fill(0).map((_, i) => ({ id: i, value: `item${i}` }))
        };
        
        // Should not throw with large context
        expect(() => {
            logger.debug('Test with large context', largeContext);
        }).not.toThrow();
    });
});