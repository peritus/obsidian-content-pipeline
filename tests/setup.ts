/**
 * Jest test setup file
 * 
 * This file runs before each test suite and sets up mocks and global test configuration.
 */

// Import the mocked obsidian module directly
import { mockApp, Notice } from './__mocks__/obsidian';

// Mock console.log for tests (Jest captures these automatically, but we can control them)
global.console = {
    ...console,
    // Uncomment to suppress logs during tests
    // log: jest.fn(),
    // debug: jest.fn(),
    // info: jest.fn(),
    // warn: jest.fn(),
    // error: jest.fn(),
};

// Set up test environment variables
process.env.NODE_ENV = 'test';
process.env.OBSIDIAN_AUDIO_INBOX_LOGLEVEL = 'error'; // Minimize logging during tests

// Global test utilities
declare global {
    namespace jest {
        interface Matchers<R> {
            toBeValidPath(): R;
            toBeValidCategory(): R;
        }
    }
}

// Custom Jest matchers
expect.extend({
    toBeValidPath(received: string) {
        const isValid = typeof received === 'string' && 
                       received.length > 0 && 
                       !received.startsWith('/') && 
                       !received.includes('..') &&
                       !received.includes('\\');
        
        return {
            message: () => `expected ${received} to be a valid vault-relative path`,
            pass: isValid,
        };
    },
    
    toBeValidCategory(received: string) {
        const isValid = typeof received === 'string' && 
                       /^[a-zA-Z0-9\-_]+$/.test(received) &&
                       received.length >= 1 && 
                       received.length <= 50;
        
        return {
            message: () => `expected ${received} to be a valid category name`,
            pass: isValid,
        };
    }
});

// Test data factories
export const createMockContext = (overrides: any = {}) => ({
    category: 'test-category',
    filename: 'test-file',
    stepId: 'test-step',
    timestamp: '2024-01-15T10:30:00Z',
    date: '2024-01-15',
    ...overrides
});

export const createMockPipelineStep = (overrides: any = {}) => ({
    model: 'whisper-1',  // Use whisper-1 as default to pass audio input validation
    input: 'inbox/audio/{category}',  // Audio input pattern
    output: 'inbox/results/{category}/{filename}.md',
    archive: 'inbox/archive/{stepId}/{category}',
    template: 'templates/default.md',
    include: ['prompt.md'],
    apiKey: 'sk-proj-test1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',  // Valid project key format
    baseUrl: 'https://api.openai.com/v1',
    ...overrides
});

export const createMockPipelineConfig = (overrides: any = {}) => ({
    'test-step': createMockPipelineStep(),
    ...overrides
});

// Cleanup function for tests
export const cleanup = () => {
    jest.clearAllMocks();
};

// Test timeout configuration
jest.setTimeout(10000);

// Export the mocked functions that tests expect
export const mockNotice = Notice;
export const mockPlugin = jest.fn();

export { mockApp };