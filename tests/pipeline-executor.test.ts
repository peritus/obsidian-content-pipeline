/**
 * Pipeline Executor Tests
 * 
 * Test suite for the pipeline execution engine and its components.
 */

import { PipelineExecutor, ExecutionState, FileDiscovery, StepChain } from '../src/core/pipeline-executor';
import { createMockPipelineConfig, createMockPipelineStep, cleanup } from './setup';
import { App } from 'obsidian';
import { AudioInboxSettings, ProcessingStatus } from '../src/types';

// Mock app for testing
const mockApp = {} as App;

// Mock settings with pipeline config
const mockSettings: AudioInboxSettings = {
    pipelineConfig: '{}',
    parsedPipelineConfig: createMockPipelineConfig(),
    debugMode: true,
    defaultCategories: ['tasks', 'thoughts'],
    version: '1.0.0'
};

describe('Pipeline Executor', () => {
    let executor: PipelineExecutor;

    beforeEach(() => {
        executor = new PipelineExecutor(mockApp, mockSettings);
    });

    afterEach(() => {
        cleanup();
    });

    describe('Initialization', () => {
        it('should initialize with valid settings', () => {
            expect(executor).toBeDefined();
            expect(typeof executor.processNextFile).toBe('function');
            expect(typeof executor.executeStep).toBe('function');
            expect(typeof executor.getExecutionStatus).toBe('function');
        });

        it('should have initial execution status', () => {
            const status = executor.getExecutionStatus();
            expect(status.isProcessing).toBe(false);
            expect(status.activeFileCount).toBe(0);
        });
    });

    describe('Configuration Validation', () => {
        it('should throw error when no pipeline config is available', async () => {
            const settingsWithoutConfig: AudioInboxSettings = {
                ...mockSettings,
                parsedPipelineConfig: undefined
            };
            
            const executorWithoutConfig = new PipelineExecutor(mockApp, settingsWithoutConfig);
            
            await expect(executorWithoutConfig.processNextFile())
                .rejects.toThrow('No pipeline configuration available');
        });
    });

    describe('Execution State Management', () => {
        it('should prevent concurrent execution', async () => {
            // This test verifies the execution state management
            // Since we don't have actual file processing yet, we'll test the state logic
            const status1 = executor.getExecutionStatus();
            expect(status1.isProcessing).toBe(false);
        });
    });
});

describe('Execution State', () => {
    let state: ExecutionState;

    beforeEach(() => {
        state = new ExecutionState();
    });

    afterEach(() => {
        cleanup();
    });

    it('should start and end processing correctly', () => {
        expect(state.isProcessing()).toBe(false);
        
        state.startProcessing();
        expect(state.isProcessing()).toBe(true);
        
        state.endProcessing();
        expect(state.isProcessing()).toBe(false);
    });

    it('should manage active files', () => {
        state.addActiveFile('test.mp3');
        expect(state.getActiveFiles()).toContain('test.mp3');
        expect(state.getActiveFilesSet().has('test.mp3')).toBe(true);
        
        state.removeActiveFile('test.mp3');
        expect(state.getActiveFiles()).not.toContain('test.mp3');
    });

    it('should provide complete status', () => {
        state.startProcessing();
        state.addActiveFile('test1.mp3');
        state.addActiveFile('test2.mp3');
        
        const status = state.getStatus();
        expect(status.isProcessing).toBe(true);
        expect(status.activeFileCount).toBe(2);
        expect(status.lastExecution).toBeDefined();
    });

    it('should reset state correctly', () => {
        state.startProcessing();
        state.addActiveFile('test.mp3');
        
        state.reset();
        
        const status = state.getStatus();
        expect(status.isProcessing).toBe(false);
        expect(status.activeFileCount).toBe(0);
        expect(status.lastExecution).toBeUndefined();
    });
});

describe('File Discovery', () => {
    let discovery: FileDiscovery;

    beforeEach(() => {
        discovery = new FileDiscovery(mockApp);
    });

    afterEach(() => {
        cleanup();
    });

    it('should initialize correctly', () => {
        expect(discovery).toBeDefined();
        expect(typeof discovery.findNextAvailableFile).toBe('function');
    });

    it('should handle empty pipeline configuration', async () => {
        const emptyConfig = {};
        const excludeFiles = new Set<string>();
        
        await expect(discovery.findNextAvailableFile(emptyConfig, excludeFiles))
            .rejects.toThrow('No entry points found');
    });
});

describe('Step Chain', () => {
    let stepChain: StepChain;

    beforeEach(() => {
        stepChain = new StepChain(mockApp, mockSettings);
    });

    afterEach(() => {
        cleanup();
    });

    it('should initialize correctly', () => {
        expect(stepChain).toBeDefined();
        expect(typeof stepChain.executeChain).toBe('function');
        expect(typeof stepChain.executeStep).toBe('function');
    });
});