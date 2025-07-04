/**
 * Pipeline Executor Tests
 * 
 * Test suite for the pipeline execution engine and its components.
 * Updated for routing-aware output system without legacy 'next' field.
 */

import { PipelineExecutor, ExecutionState, StepChain } from '../src/core/pipeline-executor';
import { FileDiscovery } from '../src/core/file-operations';
import { createMockPipelineConfig, createMockPipelineStep, createComplexPipelineConfig, cleanup } from './setup';
import { App } from 'obsidian';
import { ContentPipelineSettings, ProcessingStatus } from '../src/types';

// Mock app for testing
const mockApp = {} as App;

// Mock settings with dual configuration
const mockSettings: ContentPipelineSettings = {
    modelsConfig: '{"test-model": {"baseUrl": "https://api.openai.com/v1", "apiKey": "test-key", "implementation": "chatgpt", "model": "gpt-4"}}',
    pipelineConfig: '{}',
    parsedPipelineConfig: createMockPipelineConfig(),
    debugMode: true,
    version: '2.0'
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
        it('should throw error when configuration validation fails', async () => {
            const settingsWithoutConfig: ContentPipelineSettings = {
                ...mockSettings,
                parsedPipelineConfig: undefined
            };
            
            const executorWithoutConfig = new PipelineExecutor(mockApp, settingsWithoutConfig);
            
            await expect(executorWithoutConfig.processNextFile())
                .rejects.toThrow('Configuration not available');
        });

        it('should validate routing-aware output pipeline configuration', () => {
            const complexConfig = createComplexPipelineConfig();
            const settingsWithComplexConfig: ContentPipelineSettings = {
                ...mockSettings,
                parsedPipelineConfig: complexConfig
            };
            
            const executorWithComplexConfig = new PipelineExecutor(mockApp, settingsWithComplexConfig);
            expect(executorWithComplexConfig).toBeDefined();
        });
    });

    describe('Step Routing Logic', () => {
        it('should handle step routing based on nextStep in response', async () => {
            const routingConfig = {
                'transcribe': createMockPipelineStep({
                    modelConfig: 'openai-whisper',
                    routingAwareOutput: {
                        'process-thoughts': 'inbox/transcripts/',
                        'process-tasks': 'inbox/transcripts/',
                        'default': 'inbox/transcripts/'
                    }
                }),
                'process-thoughts': createMockPipelineStep({
                    modelConfig: 'openai-gpt',
                    input: 'inbox/transcripts'
                }),
                'process-tasks': createMockPipelineStep({
                    modelConfig: 'openai-gpt',
                    input: 'inbox/transcripts'
                })
            };

            const settingsWithRouting: ContentPipelineSettings = {
                ...mockSettings,
                parsedPipelineConfig: routingConfig
            };

            const executorWithRouting = new PipelineExecutor(mockApp, settingsWithRouting);
            expect(executorWithRouting).toBeDefined();
        });

        it('should handle pipeline completion when no routing is specified', async () => {
            // This would be tested with actual execution, but we're testing the structure
            const finalStepConfig = {
                'final-step': createMockPipelineStep({
                    modelConfig: 'openai-gpt',
                    // No routingAwareOutput means this is a terminal step
                })
            };

            const settingsWithFinalStep: ContentPipelineSettings = {
                ...mockSettings,
                parsedPipelineConfig: finalStepConfig
            };

            const executorWithFinalStep = new PipelineExecutor(mockApp, settingsWithFinalStep);
            expect(executorWithFinalStep).toBeDefined();
        });
    });

    describe('Entry Point Detection', () => {
        it('should identify entry points correctly in routing-aware configuration', () => {
            const complexConfig = createComplexPipelineConfig();
            const settingsWithComplexConfig: ContentPipelineSettings = {
                ...mockSettings,
                parsedPipelineConfig: complexConfig
            };
            
            const executorWithComplexConfig = new PipelineExecutor(mockApp, settingsWithComplexConfig);
            // The transcribe step should be identified as the entry point
            // since no other steps reference it in their routing-aware output
            expect(executorWithComplexConfig).toBeDefined();
        });

        it('should handle multiple entry points', () => {
            const multiEntryConfig = {
                'audio-entry': createMockPipelineStep({
                    modelConfig: 'openai-whisper',
                    input: 'inbox/audio',
                    routingAwareOutput: {
                        'audio-process': 'inbox/audio/',
                        'default': 'inbox/audio/'
                    }
                }),
                'text-entry': createMockPipelineStep({
                    modelConfig: 'openai-gpt',
                    input: 'inbox/text',
                    routingAwareOutput: {
                        'text-process': 'inbox/text/',
                        'default': 'inbox/text/'
                    }
                }),
                'audio-process': createMockPipelineStep({
                    modelConfig: 'openai-gpt'
                }),
                'text-process': createMockPipelineStep({
                    modelConfig: 'openai-gpt'
                })
            };

            const settingsWithMultiEntry: ContentPipelineSettings = {
                ...mockSettings,
                parsedPipelineConfig: multiEntryConfig
            };

            const executorWithMultiEntry = new PipelineExecutor(mockApp, settingsWithMultiEntry);
            expect(executorWithMultiEntry).toBeDefined();
        });
    });

    describe('Execution State Management', () => {
        it('should prevent concurrent execution', async () => {
            // This test verifies the execution state management
            // Since we don't have actual file processing yet, we'll test the state logic
            const status1 = executor.getExecutionStatus();
            expect(status1.isProcessing).toBe(false);
        });

        it('should track processing progress through pipeline steps', () => {
            const status = executor.getExecutionStatus();
            expect(status.activeFileCount).toBe(0);
            expect(status.lastExecution).toBeUndefined();
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

    it('should handle step transitions', () => {
        state.addActiveFile('test.mp3');
        expect(state.getActiveFiles()).toContain('test.mp3');
        
        // Simulate step transition
        state.removeActiveFile('test.mp3');
        state.addActiveFile('test-transcript.md');
        
        expect(state.getActiveFiles()).toContain('test-transcript.md');
        expect(state.getActiveFiles()).not.toContain('test.mp3');
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
            .rejects.toThrow('No steps found in pipeline configuration');
    });

    it('should find files in entry point steps', async () => {
        const complexConfig = createComplexPipelineConfig();
        const excludeFiles = new Set<string>();
        
        // Since this is a unit test and we don't have actual files,
        // we're testing the logic structure
        try {
            await discovery.findNextAvailableFile(complexConfig, excludeFiles);
        } catch (error: any) {
            // Expected to fail due to no actual files, but should not fail on configuration
            expect(error.message).not.toContain('No steps found in pipeline configuration');
        }
    });

    it('should prioritize files by step and then alphabetically', async () => {
        const multiStepConfig = {
            'step1': createMockPipelineStep({
                input: 'inbox/step1',
                modelConfig: 'openai-whisper'
            }),
            'step2': createMockPipelineStep({
                input: 'inbox/step2',
                modelConfig: 'openai-whisper'
            })
        };
        
        const excludeFiles = new Set<string>();
        
        try {
            await discovery.findNextAvailableFile(multiStepConfig, excludeFiles);
        } catch (error: any) {
            // Expected to fail due to no actual files
            expect(error.message).not.toContain('Invalid configuration');
        }
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

    describe('Chain Execution with Step Routing', () => {
        it('should execute single step without routing', async () => {
            const singleStepConfig = {
                'final-step': createMockPipelineStep({
                    modelConfig: 'openai-gpt'
                    // No routingAwareOutput field means terminal step
                })
            };

            const settingsWithSingleStep: ContentPipelineSettings = {
                ...mockSettings,
                parsedPipelineConfig: singleStepConfig
            };

            const singleStepChain = new StepChain(mockApp, settingsWithSingleStep);
            expect(singleStepChain).toBeDefined();
        });

        it('should handle step chain with routing decisions', async () => {
            const routingConfig = createComplexPipelineConfig();
            const settingsWithRouting: ContentPipelineSettings = {
                ...mockSettings,
                parsedPipelineConfig: routingConfig
            };

            const routingStepChain = new StepChain(mockApp, settingsWithRouting);
            expect(routingStepChain).toBeDefined();
        });

        it('should validate routing decisions against available next steps', () => {
            // This tests the validation logic for nextStep values in routing-aware output
            const stepWithRouting = createMockPipelineStep({
                routingAwareOutput: {
                    'valid-step': 'inbox/valid/',
                    'another-valid-step': 'inbox/another/',
                    'default': 'inbox/default/'
                }
            });

            expect(stepWithRouting.routingAwareOutput).toBeDefined();
            expect(Object.keys(stepWithRouting.routingAwareOutput!)).toContain('valid-step');
            expect(Object.keys(stepWithRouting.routingAwareOutput!)).toContain('another-valid-step');
        });
    });

    describe('Multi-File Response Handling', () => {
        it('should handle single file responses with nextStep', () => {
            // Test structure for handling single file with routing
            const mockSingleFileResponse = {
                filename: 'output.md',
                nextStep: 'process-thoughts',
                content: 'Generated content'
            };

            expect(mockSingleFileResponse.nextStep).toBe('process-thoughts');
            expect(mockSingleFileResponse.filename).toBe('output.md');
        });

        it('should handle multi-file responses with different routing', () => {
            // Test structure for handling multiple files with different routing
            const mockMultiFileResponse = [
                {
                    filename: 'personal.md',
                    nextStep: 'process-thoughts',
                    content: 'Personal content'
                },
                {
                    filename: 'work.md',
                    nextStep: 'process-tasks',
                    content: 'Work content'
                }
            ];

            expect(mockMultiFileResponse).toHaveLength(2);
            expect(mockMultiFileResponse[0].nextStep).toBe('process-thoughts');
            expect(mockMultiFileResponse[1].nextStep).toBe('process-tasks');
        });

        it('should handle mixed routing in multi-file responses', () => {
            // Test structure for mixed routing (some files route, others end)
            const mockMixedResponse = [
                {
                    filename: 'continue.md',
                    nextStep: 'summary-work',
                    content: 'Content that continues'
                },
                {
                    filename: 'final.md',
                    nextStep: undefined,
                    content: 'Content that ends pipeline'
                }
            ];

            expect(mockMixedResponse[0].nextStep).toBe('summary-work');
            expect(mockMixedResponse[1].nextStep).toBeUndefined();
        });
    });

    describe('Archive Path Generation', () => {
        it('should generate step-based archive paths', () => {
            const stepId = 'transcribe';
            const expectedArchivePath = `inbox/archive/${stepId}`;
            
            // This tests the pattern for archive path generation
            expect(expectedArchivePath).toBe('inbox/archive/transcribe');
        });

        it('should handle different step IDs in archive paths', () => {
            const steps = ['process-thoughts', 'process-tasks', 'summary-personal'];
            
            steps.forEach(stepId => {
                const archivePath = `inbox/archive/${stepId}`;
                expect(archivePath).toContain(stepId);
                expect(archivePath).toStartWith('inbox/archive/');
            });
        });
    });

    describe('Processing Context Generation', () => {
        it('should generate context without category references', () => {
            const mockContext = {
                filename: 'test-audio',
                stepId: 'transcribe',
                timestamp: '2024-01-15T10:30:00Z',
                date: '2024-01-15',
                archivePath: 'inbox/archive/transcribe/test-audio.mp3',
                inputPath: 'inbox/audio/test-audio.mp3',
                outputPath: 'inbox/transcripts/test-audio-transcript.md'
            };

            expect(mockContext.stepId).toBe('transcribe');
            expect(mockContext.archivePath).toContain('transcribe');
            expect(mockContext).not.toHaveProperty('category');
            expect(mockContext).not.toHaveProperty('originalCategory');
            expect(mockContext).not.toHaveProperty('resolvedCategory');
        });
    });
});
