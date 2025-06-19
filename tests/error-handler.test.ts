/**
 * Simplified Error Handling System Tests
 * 
 * Test suite for the simplified error handling framework.
 */

import { 
    AudioInboxError, 
    ErrorFactory, 
    ErrorHandler, 
    errorHandler
} from '../src/error-handler';
import { ErrorType, NotificationType } from '../src/types';
import { mockNotice, cleanup } from './setup';

describe('AudioInboxError', () => {
    afterEach(() => {
        cleanup();
    });

    it('should create error with all properties', () => {
        const error = new AudioInboxError(
            ErrorType.CONFIGURATION,
            'Technical message',
            'User-friendly message',
            { test: true },
            ['Suggestion 1', 'Suggestion 2']
        );

        expect(error.type).toBe(ErrorType.CONFIGURATION);
        expect(error.message).toBe('Technical message');
        expect(error.userMessage).toBe('User-friendly message');
        expect(error.context).toEqual({ test: true });
        expect(error.suggestions).toEqual(['Suggestion 1', 'Suggestion 2']);
        expect(error.name).toBe('AudioInboxError');
    });

    it('should convert to ErrorInfo object', () => {
        const error = new AudioInboxError(
            ErrorType.VALIDATION,
            'Test message',
            'User message'
        );

        const errorInfo = error.toErrorInfo();

        expect(errorInfo.type).toBe(ErrorType.VALIDATION);
        expect(errorInfo.message).toBe('Test message');
        expect(errorInfo.userMessage).toBe('User message');
        expect(errorInfo.stack).toBeDefined();
    });

    it('should determine severity based on error type', () => {
        const configError = new AudioInboxError(ErrorType.CONFIGURATION, 'msg', 'user msg');
        const fsError = new AudioInboxError(ErrorType.FILE_SYSTEM, 'msg', 'user msg');
        const validationError = new AudioInboxError(ErrorType.VALIDATION, 'msg', 'user msg');

        expect(configError.getSeverity()).toBe(NotificationType.ERROR);
        expect(fsError.getSeverity()).toBe(NotificationType.WARNING);
        expect(validationError.getSeverity()).toBe(NotificationType.WARNING);
    });
});

describe('ErrorFactory', () => {
    afterEach(() => {
        cleanup();
    });

    it('should create configuration errors', () => {
        const error = ErrorFactory.configuration(
            'Config invalid',
            'Configuration error',
            { key: 'value' }
        );

        expect(error.type).toBe(ErrorType.CONFIGURATION);
        expect(error.message).toBe('Config invalid');
        expect(error.userMessage).toBe('Configuration error');
        expect(error.context).toEqual({ key: 'value' });
        expect(error.suggestions).toContain('Check your plugin settings');
    });

    it('should create file system errors', () => {
        const error = ErrorFactory.fileSystem(
            'File not found',
            'File error'
        );

        expect(error.type).toBe(ErrorType.FILE_SYSTEM);
        expect(error.message).toBe('File not found');
        expect(error.userMessage).toBe('File error');
        expect(error.suggestions).toContain('Check file permissions');
    });

    it('should create API errors', () => {
        const error = ErrorFactory.api(
            'API failed',
            'API error'
        );

        expect(error.type).toBe(ErrorType.API);
        expect(error.suggestions).toContain('Check your API key');
    });
});

describe('ErrorHandler', () => {
    afterEach(() => {
        cleanup();
    });

    it('should be a singleton', () => {
        const instance1 = ErrorHandler.getInstance();
        const instance2 = ErrorHandler.getInstance();
        
        expect(instance1).toBe(instance2);
        expect(instance1).toBe(errorHandler);
    });

    it('should handle AudioInboxError instances', () => {
        const error = ErrorFactory.validation('Test error', 'User error');
        
        // This should not throw
        expect(() => {
            errorHandler.handleError(error);
        }).not.toThrow();

        // Should show notification
        expect(mockNotice).toHaveBeenCalled();
    });

    it('should handle unknown errors', () => {
        const jsError = new Error('JavaScript error');
        
        expect(() => {
            errorHandler.handleUnknownError(jsError, { context: 'test' });
        }).not.toThrow();

        expect(mockNotice).toHaveBeenCalled();
    });

    it('should handle non-Error objects', () => {
        const stringError = 'String error';
        
        expect(() => {
            errorHandler.handleUnknownError(stringError, { context: 'test' });
        }).not.toThrow();

        expect(mockNotice).toHaveBeenCalled();
    });
});

describe('Error Integration', () => {
    afterEach(() => {
        cleanup();
    });

    it('should handle complete error flow', () => {
        // Create an error
        const error = ErrorFactory.configuration(
            'Configuration is invalid',
            'Please check your settings',
            { setting: 'invalid' }
        );

        // Handle the error
        errorHandler.handleError(error);

        // Verify notification was shown with correct timeout
        expect(mockNotice).toHaveBeenCalledWith(
            'Please check your settings',
            6000
        );
    });
});

describe('Error Types', () => {
    it('should have all required error types', () => {
        expect(ErrorType.CONFIGURATION).toBe('configuration');
        expect(ErrorType.FILE_SYSTEM).toBe('filesystem');
        expect(ErrorType.API).toBe('api');
        expect(ErrorType.PIPELINE).toBe('pipeline');
        expect(ErrorType.VALIDATION).toBe('validation');
        expect(ErrorType.PARSING).toBe('parsing');
    });
});

describe('Notification Types', () => {
    it('should have all required notification types', () => {
        expect(NotificationType.SUCCESS).toBe('success');
        expect(NotificationType.ERROR).toBe('error');
        expect(NotificationType.WARNING).toBe('warning');
        expect(NotificationType.INFO).toBe('info');
    });
});
