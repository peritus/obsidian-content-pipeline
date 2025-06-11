/**
 * Jest test setup file
 * 
 * This file runs before each test suite and sets up mocks and global test configuration.
 */

// Mock Obsidian dependencies
const mockNotice = jest.fn();
const mockPlugin = jest.fn();
const mockApp = jest.fn();

// Mock Obsidian module
jest.mock('obsidian', () => ({
    Plugin: jest.fn().mockImplementation(() => ({
        app: mockApp,
        manifest: {
            id: 'obsidian-audio-inbox',
            name: 'Audio Inbox',
            version: '1.0.0'
        },
        loadData: jest.fn().mockResolvedValue({}),
        saveData: jest.fn().mockResolvedValue(undefined),
        addRibbonIcon: jest.fn(),
        addSettingTab: jest.fn()
    })),
    Notice: mockNotice,
    Setting: jest.fn().mockImplementation(() => ({
        setName: jest.fn().mockReturnThis(),
        setDesc: jest.fn().mockReturnThis(),
        addToggle: jest.fn().mockReturnThis(),
        addText: jest.fn().mockReturnThis(),
        addTextArea: jest.fn().mockReturnThis(),
        addButton: jest.fn().mockReturnThis(),
        onChange: jest.fn().mockReturnThis(),
        onClick: jest.fn().mockReturnThis()
    })),
    PluginSettingTab: jest.fn().mockImplementation(() => ({
        display: jest.fn(),
        hide: jest.fn()
    }))
}));

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
    model: 'gpt-4',
    input: 'inbox/{category}',
    output: 'inbox/results/{category}/{filename}.md',
    archive: 'inbox/archive/{stepId}/{category}',
    template: 'templates/default.md',
    include: ['prompt.md'],
    apiKey: 'sk-test-key',
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

export { mockNotice, mockPlugin, mockApp };