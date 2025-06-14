/**
 * Error Handling System Tests
 * 
 * Test suite for the error handling framework.
 */

import { 
    AudioInboxError, 
    ErrorFactory, 
    ErrorHandler, 
    NotificationManager,
    errorHandler,
    notificationManager,
    createUserFriendlyMessage,
    wrapAsync,
    wrapSync
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

    it('should create pipeline errors', () => {
        const error = ErrorFactory.pipeline(
            'Pipeline failed',
            'Pipeline error'
        );

        expect(error.type).toBe(ErrorType.PIPELINE);
        expect(error.suggestions).toContain('Check your pipeline configuration');
    });

    it('should create validation errors', () => {
        const error = ErrorFactory.validation(
            'Validation failed',
            'Validation error'
        );

        expect(error.type).toBe(ErrorType.VALIDATION);
        expect(error.suggestions).toContain('Check your input data');
    });

    it('should create parsing errors', () => {
        const error = ErrorFactory.parsing(
            'Parse failed',
            'Parsing error'
        );

        expect(error.type).toBe(ErrorType.PARSING);
        expect(error.suggestions).toContain('Check your data format');
    });

    it('should accept custom suggestions', () => {
        const customSuggestions = ['Custom suggestion 1', 'Custom suggestion 2'];
        const error = ErrorFactory.configuration(
            'Test',
            'Test',
            {},
            customSuggestions
        );

        expect(error.suggestions).toEqual(customSuggestions);
    });
});

describe('NotificationManager', () => {
    afterEach(() => {
        cleanup();
    });

    it('should be a singleton', () => {
        const instance1 = NotificationManager.getInstance();
        const instance2 = NotificationManager.getInstance();
        
        expect(instance1).toBe(instance2);
        expect(instance1).toBe(notificationManager);
    });

    it('should show notifications with different types', () => {
        notificationManager.success('Success message');
        notificationManager.error('Error message');
        notificationManager.warning('Warning message');
        notificationManager.info('Info message');

        // mockNotice should be called for each notification
        expect(mockNotice).toHaveBeenCalledTimes(4);
    });

    it('should use appropriate timeouts for different types', () => {
        notificationManager.success('Success', { timeout: 1000 });
        notificationManager.error('Error', { timeout: 2000 });
        
        expect(mockNotice).toHaveBeenCalledWith('Success', 1000);
        expect(mockNotice).toHaveBeenCalledWith('Error', 2000);
    });

    it('should handle notification errors gracefully', () => {
        // Mock Notice to throw an error
        mockNotice.mockImplementationOnce(() => {
            throw new Error('Notification failed');
        });

        // This should not throw, but handle the error gracefully
        expect(() => {
            notificationManager.info('Test message');
        }).not.toThrow();
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

    it('should create user-friendly messages', () => {
        const errorInfo = {
            type: ErrorType.CONFIGURATION,
            message: 'Technical details',
            userMessage: 'User message',
            context: {}
        };

        const friendlyMessage = createUserFriendlyMessage(errorInfo);
        
        expect(friendlyMessage).toContain('Configuration Error');
        expect(friendlyMessage).toContain('User message');
    });

    it('should wrap async functions with error handling', () => {
        const asyncFn = jest.fn().mockResolvedValue('success');
        const wrappedFn = wrapAsync(asyncFn, 'test context');

        expect(typeof wrappedFn).toBe('function');
        
        // Should return a promise
        const result = wrappedFn('arg1', 'arg2');
        expect(result).toBeInstanceOf(Promise);
    });

    it('should wrap sync functions with error handling', () => {
        const syncFn = jest.fn().mockReturnValue('success');
        const wrappedFn = wrapSync(syncFn, 'test context');

        expect(typeof wrappedFn).toBe('function');
        
        const result = wrappedFn('arg1', 'arg2');
        expect(result).toBe('success');
        expect(syncFn).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('should handle errors in wrapped async functions', async () => {
        const asyncFn = jest.fn().mockRejectedValue(new Error('Async error'));
        const wrappedFn = wrapAsync(asyncFn, 'test context');

        await expect(wrappedFn()).rejects.toThrow('Async error');
        expect(mockNotice).toHaveBeenCalled();
    });

    it('should handle errors in wrapped sync functions', () => {
        const syncFn = jest.fn().mockImplementation(() => {
            throw new Error('Sync error');
        });
        const wrappedFn = wrapSync(syncFn, 'test context');

        expect(() => wrappedFn()).toThrow('Sync error');
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
            { setting: 'invalid' },
            ['Check setting X', 'Restart plugin']
        );

        // Handle the error
        errorHandler.handleError(error);

        // Verify notification was shown
        expect(mockNotice).toHaveBeenCalledWith(
            expect.stringContaining('Please check your settings'),
            expect.any(Number)
        );
    });

    it('should include suggestions in user message', () => {
        const error = ErrorFactory.validation(
            'Invalid input',
            'Input validation failed',
            {},
            ['Fix input format', 'Check documentation']
        );

        errorHandler.handleError(error);

        const lastCall = mockNotice.mock.calls[mockNotice.mock.calls.length - 1];
        const message = lastCall[0];
        
        expect(message).toContain('Suggestions:');
        expect(message).toContain('Fix input format');
        expect(message).toContain('Check documentation');
    });

    it('should handle AudioInboxError instances in handleUnknownError', () => {
        const audioInboxError = ErrorFactory.api('API failed', 'API error');
        
        errorHandler.handleUnknownError(audioInboxError, { context: 'test' });
        
        // Should handle it as an AudioInboxError, not create a new pipeline error
        expect(mockNotice).toHaveBeenCalledWith(
            expect.stringContaining('API error'),
            expect.any(Number)
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
