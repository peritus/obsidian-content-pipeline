/**
 * Jest test setup file
 * 
 * This file runs before each test suite and sets up mocks and global test configuration.
 * Updated for routing-aware output system without legacy 'next' field.
 */

// Import the mocked obsidian module directly
import { mockApp, Notice } from './__mocks__/obsidian';
import { PipelineConfiguration, ModelsConfig, ModelConfig, PipelineStep } from '../src/types';

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
process.env.OBSIDIAN_CONTENT_PIPELINE_LOGLEVEL = 'error'; // Minimize logging during tests

// Global test utilities
declare global {
    namespace jest {
        interface Matchers<R> {
            toBeValidPath(): R;
            toBeValidStepId(): R;
            toStartWith(expected: string): R;
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
    
    toBeValidStepId(received: string) {
        const isValid = typeof received === 'string' && 
                       /^[a-zA-Z][a-zA-Z0-9\-_]*$/.test(received) &&
                       received.length >= 1 && 
                       received.length <= 50;
        
        return {
            message: () => `expected ${received} to be a valid step ID`,
            pass: isValid,
        };
    },

    toStartWith(received: string, expected: string) {
        const pass = typeof received === 'string' && received.startsWith(expected);
        
        return {
            message: () => `expected "${received}" to start with "${expected}"`,
            pass,
        };
    }
});

// Test data factories

export const createMockContext = (overrides: any = {}) => ({
    filename: 'test-file',
    stepId: 'test-step',
    timestamp: '2024-01-15T10:30:00Z',
    date: '2024-01-15',
    archivePath: 'inbox/archive/test-step/test-file.mp3',
    inputPath: 'inbox/audio/test-file.mp3',
    outputPath: 'inbox/results/test-file.md',
    ...overrides
});

// Factory for creating mock model configurations
export const createMockModelConfig = (overrides: Partial<ModelConfig> = {}): ModelConfig => ({
    baseUrl: 'https://api.openai.com/v1',
    apiKey: 'sk-proj-test1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    implementation: 'chatgpt',
    model: 'gpt-4',
    organization: '',
    ...overrides
});

// Factory for creating mock models configuration
export const createMockModelsConfig = (overrides: Partial<ModelsConfig> = {}): ModelsConfig => ({
    'openai-gpt': createMockModelConfig({
        implementation: 'chatgpt',
        model: 'gpt-4'
    }),
    'openai-whisper': createMockModelConfig({
        implementation: 'whisper',
        model: 'whisper-1'
    }),
    'test-model': createMockModelConfig(),
    ...overrides
});

// Factory for creating mock pipeline steps - now uses prompts/context instead of include
export const createMockPipelineStep = (overrides: Partial<PipelineStep> = {}): PipelineStep => ({
    modelConfig: 'test-model',  // Reference to models config
    input: 'inbox/audio/',
    output: 'inbox/results/',
    archive: 'inbox/archive/test-step/',
    prompts: ['prompt.md'],
    description: 'Test pipeline step for automated testing',
    ...overrides
});

// Factory for creating mock pipeline configuration
export const createMockPipelineConfig = (overrides: Partial<PipelineConfiguration> = {}): PipelineConfiguration => ({
    'test-step': createMockPipelineStep(),
    ...overrides
});

// Mock file info factory
export const createMockFileInfo = (overrides: any = {}) => ({
    name: 'test-audio.mp3',
    path: 'inbox/audio/test-audio.mp3',
    size: 1024,
    extension: '.mp3',
    isProcessable: true,
    lastModified: new Date(),
    mimeType: 'audio/mpeg',
    ...overrides
});

// Mock file metadata factory
export const createMockFileMetadata = (overrides: any = {}) => ({
    source: 'inbox/archive/transcribe/test-audio.mp3',
    processed: '2024-01-15T10:30:00Z',
    step: 'transcribe',
    nextStep: 'process-thoughts',
    version: '2.0',
    ...overrides
});

// Mock YAML response section for testing
export const createMockYamlSection = (overrides: any = {}) => ({
    filename: 'output.md',
    nextStep: 'process-thoughts',
    content: '# Test Content\n\nThis is test content for YAML processing.',
    ...overrides
});

// Mock step routing info for testing
export const createMockStepRouting = (overrides: any = {}) => ({
    available_next_steps: {
        'process-thoughts': 'If the document contains personal thoughts or reflections',
        'process-tasks': 'If the document contains work-related content or action items',
        'process-ideas': 'If the document contains innovative concepts or brainstorming'
    },
    ...overrides
});

// Mock pipeline validation result
export const createMockValidationResult = (overrides: any = {}) => ({
    isValid: true,
    errors: [],
    warnings: [],
    entryPoints: ['transcribe'],
    orphanedSteps: [],
    circularReferences: [],
    ...overrides
});

// Mock processing result
export const createMockProcessingResult = (overrides: any = {}) => ({
    inputFile: createMockFileInfo(),
    status: 'completed',
    outputFiles: ['inbox/transcripts/test-audio-transcript.md'],
    archivePath: 'inbox/archive/transcribe/test-audio.mp3',
    startTime: new Date(),
    endTime: new Date(),
    stepId: 'transcribe',
    nextStep: 'process-thoughts',
    ...overrides
});

// Helper function to create complex pipeline configurations for testing
export const createComplexPipelineConfig = (): PipelineConfiguration => ({
    'transcribe': createMockPipelineStep({
        modelConfig: 'openai-whisper',
        input: 'inbox/audio/',
        output: 'inbox/transcripts/',
        routingAwareOutput: {
            'process-thoughts': 'inbox/transcripts/',
            'process-tasks': 'inbox/transcripts/', 
            'process-ideas': 'inbox/transcripts/',
            'default': 'inbox/transcripts/'
        },
        archive: 'inbox/archive/transcribe/',
        prompts: ['transcriptionprompt.md'],
        description: 'Transcribe audio files to text'
    }),
    'process-thoughts': createMockPipelineStep({
        modelConfig: 'openai-gpt',
        input: 'inbox/transcripts/',
        output: 'inbox/process-thoughts/',
        routingAwareOutput: {
            'summary-personal': 'inbox/process-thoughts/',
            'default': 'inbox/process-thoughts/'
        },
        archive: 'inbox/archive/process-thoughts/',
        prompts: ['process-thoughts-prompt.md'],
        description: 'Process personal thoughts and reflections'
    }),
    'process-tasks': createMockPipelineStep({
        modelConfig: 'openai-gpt',
        input: 'inbox/transcripts/',
        output: 'inbox/process-tasks/',
        routingAwareOutput: {
            'summary-work': 'inbox/process-tasks/',
            'default': 'inbox/process-tasks/'
        },
        archive: 'inbox/archive/process-tasks/',
        prompts: ['process-tasks-prompt.md'],
        description: 'Process work content and action items'
    }),
    'process-ideas': createMockPipelineStep({
        modelConfig: 'openai-gpt',
        input: 'inbox/transcripts/',
        output: 'inbox/process-ideas/',
        routingAwareOutput: {
            'summary-personal': 'inbox/process-ideas/',
            'summary-work': 'inbox/process-ideas/',
            'default': 'inbox/process-ideas/'
        },
        archive: 'inbox/archive/process-ideas/',
        prompts: ['process-ideas-prompt.md'],
        description: 'Process innovative ideas and concepts'
    }),
    'summary-personal': createMockPipelineStep({
        modelConfig: 'openai-gpt',
        input: 'inbox/process-thoughts/',
        output: 'inbox/summary-personal/',
        archive: 'inbox/archive/summary-personal/',
        prompts: ['summary-personal-prompt.md'],
        context: ['inbox/summary-personal/*'],
        description: 'Create personal summaries and insights'
    }),
    'summary-work': createMockPipelineStep({
        modelConfig: 'openai-gpt',
        input: 'inbox/process-tasks/',
        output: 'inbox/summary-work/',
        archive: 'inbox/archive/summary-work/',
        prompts: ['summary-work-prompt.md'],
        context: ['inbox/summary-work/*'],
        description: 'Create work-focused summaries with action items'
    })
});

// Helper function to create complex models config for testing
export const createComplexModelsConfig = (): ModelsConfig => ({
    'openai-gpt': createMockModelConfig({
        implementation: 'chatgpt',
        model: 'gpt-4'
    }),
    'openai-whisper': createMockModelConfig({
        implementation: 'whisper',
        model: 'whisper-1'
    })
});

// Helper function to create invalid configurations for testing
export const createInvalidPipelineConfig = (errorType: string): PipelineConfiguration => {
    const baseStep = createMockPipelineStep();
    
    switch (errorType) {
        case 'circular':
            return {
                'step1': {
                    ...baseStep,
                    routingAwareOutput: { 'step2': 'inbox/step2/' }
                },
                'step2': {
                    ...baseStep,
                    routingAwareOutput: { 'step1': 'inbox/step1/' }
                }
            };
        case 'missing-reference':
            return {
                'step1': {
                    ...baseStep,
                    routingAwareOutput: { 'non-existent': 'inbox/non-existent/' }
                }
            };
        case 'orphaned':
            return {
                'entry': {
                    ...baseStep,
                    routingAwareOutput: { 'connected': 'inbox/connected/' }
                },
                'connected': { ...baseStep },
                'orphaned': { ...baseStep }
            };
        case 'no-audio':
            return {
                'text-only': {
                    ...baseStep,
                    modelConfig: 'openai-gpt',
                    input: 'text/input/'
                }
            };
        default:
            return {
                'default-step': baseStep
            };
    }
};

// Helper function to create invalid models config for testing
export const createInvalidModelsConfig = (errorType: string): ModelsConfig => {
    const baseModel = createMockModelConfig();
    
    switch (errorType) {
        case 'missing-fields':
            return {
                'invalid-model': {
                    ...baseModel,
                    apiKey: '', // Missing API key
                    baseUrl: ''  // Missing base URL
                }
            };
        case 'invalid-implementation':
            return {
                'invalid-model': {
                    ...baseModel,
                    implementation: 'invalid-type' as any
                }
            };
        default:
            return {
                'default-model': baseModel
            };
    }
};

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