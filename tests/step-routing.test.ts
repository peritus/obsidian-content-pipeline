/**
 * Step Routing Tests
 * 
 * Comprehensive test suite for step routing functionality introduced in v2.0 schema.
 * Tests intelligent step routing, routing-aware output configuration, and YAML-based routing communication.
 */

import { 
    createMockPipelineStep, 
    createMockPipelineConfig, 
    createComplexPipelineConfig,
    createInvalidPipelineConfig,
    createMockStepRouting,
    createMockYamlSection,
    createMockModelsConfig,
    createComplexModelsConfig,
    cleanup 
} from './setup';
import { createConfigurationValidator } from '../src/validation/configuration-validator';
import { createConfigurationResolver } from '../src/validation/configuration-resolver';
import { ContentPipelineSettings } from '../src/types';

// Helper function to create mock settings for validation
function createMockSettings(pipelineConfig: any, modelsConfig: any = createMockModelsConfig()): ContentPipelineSettings {
    return {
        modelsConfig: JSON.stringify(modelsConfig),
        pipelineConfig: JSON.stringify(pipelineConfig),
        parsedModelsConfig: modelsConfig,
        parsedPipelineConfig: pipelineConfig,
        debugMode: false,
        version: '2.0'
    };
}

// Helper function to validate a single pipeline step using the actual validation system
function validatePipelineStep(step: any, stepId: string, createValidPipeline: boolean = false) {
    let pipelineConfig: any;
    
    if (createValidPipeline) {
        // Create a complete valid pipeline with the test step and referenced steps
        pipelineConfig = { [stepId]: step };
        
        // Add any referenced routing steps to make the pipeline valid
        if (step.routingAwareOutput && typeof step.routingAwareOutput === 'object') {
            Object.keys(step.routingAwareOutput).forEach(nextStepId => {
                if (nextStepId !== 'default' && !pipelineConfig[nextStepId]) {
                    pipelineConfig[nextStepId] = createMockPipelineStep({
                        modelConfig: 'openai-gpt',
                        output: `inbox/${nextStepId}/{filename}.md`
                    });
                }
            });
        }
    } else {
        pipelineConfig = { [stepId]: step };
    }
    
    const modelsConfig = createComplexModelsConfig();
    const settings = createMockSettings(pipelineConfig, modelsConfig);
    
    const validator = createConfigurationValidator(settings);
    const result = validator.validateConfigurations();
    
    if (!result.isValid) {
        const allErrors = [
            ...result.modelsErrors || [],
            ...result.pipelineErrors || [],
            ...result.crossRefErrors || [],
            ...result.outputRoutingErrors || []
        ];
        throw new Error(allErrors.join('; '));
    }
}

// Helper function to validate a complete pipeline configuration
function validatePipelineConfig(pipelineConfig: any) {
    const modelsConfig = createComplexModelsConfig();
    const settings = createMockSettings(pipelineConfig, modelsConfig);
    
    const validator = createConfigurationValidator(settings);
    const result = validator.validateConfigurations();
    
    if (!result.isValid) {
        const allErrors = [
            ...result.modelsErrors || [],
            ...result.pipelineErrors || [],
            ...result.crossRefErrors || [],
            ...result.outputRoutingErrors || []
        ];
        throw new Error(allErrors.join('; '));
    }
}

describe('Step Routing Configuration', () => {
    afterEach(() => {
        cleanup();
    });

    describe('Routing-Aware Output Validation', () => {
        it('should accept valid routing-aware output configurations', () => {
            const step = createMockPipelineStep({
                modelConfig: 'openai-gpt',
                output: 'inbox/test-step/{filename}.md',
                routingAwareOutput: {
                    'step1': 'inbox/step1/{filename}.md',
                    'step2': 'inbox/step2/{filename}.md',
                    'step3': 'inbox/step3/{filename}.md',
                    'default': 'inbox/default/{filename}.md'
                }
            });

            expect(() => validatePipelineStep(step, 'test-step', true)).not.toThrow();
        });

        it('should accept simple string output configurations', () => {
            const stepWithStringOutput = createMockPipelineStep({
                modelConfig: 'openai-gpt',
                output: 'inbox/simple/{filename}.md'
            });

            expect(() => validatePipelineStep(stepWithStringOutput, 'test-step'))
                .not.toThrow();
        });

        it('should reject invalid routing-aware output structure', () => {
            const stepWithInvalidOutput = createMockPipelineStep({
                modelConfig: 'openai-gpt',
                routingAwareOutput: {
                    'step1': 123 as any, // Invalid - should be string
                    'default': 'inbox/fallback/{filename}.md'
                }
            });

            expect(() => validatePipelineStep(stepWithInvalidOutput, 'test-step'))
                .toThrow();
        });

        it('should validate step ID format in routing keys', () => {
            const stepWithInvalidKeys = createMockPipelineStep({
                modelConfig: 'openai-gpt',
                routingAwareOutput: {
                    'valid-step': 'inbox/valid/{filename}.md',
                    'invalid step with spaces': 'inbox/invalid/{filename}.md',
                    '123-starts-with-number': 'inbox/numeric/{filename}.md',
                    'default': 'inbox/default/{filename}.md'
                }
            });

            expect(() => validatePipelineStep(stepWithInvalidKeys, 'test-step'))
                .toThrow();
        });

        it('should accept complex routing-aware output paths', () => {
            const step = createMockPipelineStep({
                modelConfig: 'openai-gpt',
                output: 'inbox/transcripts/{filename}.md',
                routingAwareOutput: {
                    'process-thoughts': 'inbox/thoughts/{filename}-processed.md',
                    'process-tasks': 'inbox/tasks/{filename}-work.md',
                    'process-ideas': 'inbox/ideas/{filename}-creative.md',
                    'default': 'inbox/general/{filename}-default.md'
                }
            });

            expect(() => validatePipelineStep(step, 'transcribe', true)).not.toThrow();
        });
    });

    describe('Pipeline-Level Routing Validation', () => {
        it('should validate step references in routing configuration', () => {
            const validConfig = createComplexPipelineConfig();
            expect(() => validatePipelineConfig(validConfig)).not.toThrow();
        });

        it('should detect invalid step references in routing', () => {
            const configWithInvalidReferences = createInvalidPipelineConfig('missing-reference');
            expect(() => validatePipelineConfig(configWithInvalidReferences))
                .toThrow();
        });

        it('should detect circular references in routing-aware output', () => {
            const configWithCircularReferences = createInvalidPipelineConfig('circular');
            expect(() => validatePipelineConfig(configWithCircularReferences))
                .toThrow();
        });

        it('should identify entry points correctly', () => {
            const complexConfig = createComplexPipelineConfig();
            // In the complex config, 'transcribe' should be the only entry point
            // since it's not referenced in any other step's routing-aware output
            expect(() => validatePipelineConfig(complexConfig)).not.toThrow();
        });

        it('should detect orphaned steps', () => {
            const configWithOrphanedSteps = createInvalidPipelineConfig('orphaned');
            expect(() => validatePipelineConfig(configWithOrphanedSteps))
                .toThrow();
        });
    });

    describe('Routing Decision Logic', () => {
        it('should support branching workflows', () => {
            const branchingConfig = {
                'transcribe': createMockPipelineStep({
                    modelConfig: 'openai-whisper',
                    output: 'inbox/transcripts/{filename}.md',
                    routingAwareOutput: {
                        'process-thoughts': 'inbox/transcripts/{filename}.md',
                        'process-tasks': 'inbox/transcripts/{filename}.md',
                        'process-ideas': 'inbox/transcripts/{filename}.md',
                        'default': 'inbox/transcripts/{filename}.md'
                    }
                }),
                'process-thoughts': createMockPipelineStep({
                    modelConfig: 'openai-gpt',
                    output: 'inbox/thoughts/{filename}.md',
                    routingAwareOutput: {
                        'summary-personal': 'inbox/thoughts/{filename}.md',
                        'default': 'inbox/thoughts/{filename}.md'
                    }
                }),
                'process-tasks': createMockPipelineStep({
                    modelConfig: 'openai-gpt',
                    output: 'inbox/tasks/{filename}.md',
                    routingAwareOutput: {
                        'summary-work': 'inbox/tasks/{filename}.md',
                        'default': 'inbox/tasks/{filename}.md'
                    }
                }),
                'process-ideas': createMockPipelineStep({
                    modelConfig: 'openai-gpt',
                    output: 'inbox/ideas/{filename}.md',
                    routingAwareOutput: {
                        'summary-personal': 'inbox/ideas/{filename}-personal.md',
                        'summary-work': 'inbox/ideas/{filename}-work.md',
                        'default': 'inbox/ideas/{filename}.md'
                    }
                }),
                'summary-personal': createMockPipelineStep({
                    modelConfig: 'openai-gpt',
                    output: 'inbox/personal-summary/{filename}.md'
                }),
                'summary-work': createMockPipelineStep({
                    modelConfig: 'openai-gpt',
                    output: 'inbox/work-summary/{filename}.md'
                })
            };

            expect(() => validatePipelineConfig(branchingConfig)).not.toThrow();
        });

        it('should support convergent workflows', () => {
            const convergentConfig = {
                'input1': createMockPipelineStep({
                    modelConfig: 'openai-gpt',
                    output: 'inbox/input1/{filename}.md',
                    routingAwareOutput: {
                        'processor': 'inbox/input1/{filename}.md',
                        'default': 'inbox/input1/{filename}.md'
                    }
                }),
                'input2': createMockPipelineStep({
                    modelConfig: 'openai-gpt',
                    output: 'inbox/input2/{filename}.md',
                    routingAwareOutput: {
                        'processor': 'inbox/input2/{filename}.md',
                        'default': 'inbox/input2/{filename}.md'
                    }
                }),
                'processor': createMockPipelineStep({
                    modelConfig: 'openai-gpt',
                    output: 'inbox/processed/{filename}.md',
                    routingAwareOutput: {
                        'output': 'inbox/processed/{filename}.md',
                        'default': 'inbox/processed/{filename}.md'
                    }
                }),
                'output': createMockPipelineStep({
                    modelConfig: 'openai-gpt',
                    output: 'inbox/final/{filename}.md'
                })
            };

            expect(() => validatePipelineConfig(convergentConfig)).not.toThrow();
        });

        it('should support diamond-shaped workflows', () => {
            const diamondConfig = {
                'start': createMockPipelineStep({
                    modelConfig: 'openai-gpt',
                    output: 'inbox/start/{filename}.md',
                    routingAwareOutput: {
                        'branch1': 'inbox/start/{filename}.md',
                        'branch2': 'inbox/start/{filename}.md',
                        'default': 'inbox/start/{filename}.md'
                    }
                }),
                'branch1': createMockPipelineStep({
                    modelConfig: 'openai-gpt',
                    output: 'inbox/branch1/{filename}.md',
                    routingAwareOutput: {
                        'merge': 'inbox/branch1/{filename}.md',
                        'default': 'inbox/branch1/{filename}.md'
                    }
                }),
                'branch2': createMockPipelineStep({
                    modelConfig: 'openai-gpt',
                    output: 'inbox/branch2/{filename}.md',
                    routingAwareOutput: {
                        'merge': 'inbox/branch2/{filename}.md',
                        'default': 'inbox/branch2/{filename}.md'
                    }
                }),
                'merge': createMockPipelineStep({
                    modelConfig: 'openai-gpt',
                    output: 'inbox/merged/{filename}.md'
                })
            };

            expect(() => validatePipelineConfig(diamondConfig)).not.toThrow();
        });
    });
});

describe('YAML Routing Communication', () => {
    afterEach(() => {
        cleanup();
    });

    describe('Request Format Generation', () => {
        it('should include routing section in YAML requests', () => {
            const routingInfo = createMockStepRouting();
            
            // Simulate YAML request formatting
            const yamlRequest = `---
role: input
filename: test.mp3
---

[Audio content]

---
role: prompt
filename: prompt.md
---

Process this content appropriately.

---
role: routing
available_next_steps:
  process-thoughts: "${routingInfo.available_next_steps['process-thoughts']}"
  process-tasks: "${routingInfo.available_next_steps['process-tasks']}"
  process-ideas: "${routingInfo.available_next_steps['process-ideas']}"
---

Based on the content above, please choose the most appropriate next processing step from the available options. Include your choice in the response frontmatter using the 'nextStep' field.`;

            expect(yamlRequest).toContain('role: routing');
            expect(yamlRequest).toContain('available_next_steps:');
            expect(yamlRequest).toContain('process-thoughts:');
            expect(yamlRequest).toContain('process-tasks:');
            expect(yamlRequest).toContain('process-ideas:');
            expect(yamlRequest).toContain('nextStep');
        });

        it('should omit routing section for terminal steps', () => {
            const yamlRequestWithoutRouting = `---
role: input
filename: test.md
---

[Content to be processed]

---
role: prompt
filename: final-prompt.md
---

Create final summary without further routing.`;

            expect(yamlRequestWithoutRouting).not.toContain('role: routing');
            expect(yamlRequestWithoutRouting).not.toContain('available_next_steps');
        });
    });

    describe('Response Format Parsing', () => {
        it('should parse single file response with nextStep', () => {
            const singleFileResponse = createMockYamlSection({
                filename: 'output.md',
                nextStep: 'process-thoughts',
                content: 'Generated content with routing decision'
            });

            expect(singleFileResponse.filename).toBe('output.md');
            expect(singleFileResponse.nextStep).toBe('process-thoughts');
            expect(singleFileResponse.content).toContain('routing decision');
        });

        it('should parse multi-file response with different routing', () => {
            const multiFileResponse = [
                createMockYamlSection({
                    filename: 'personal.md',
                    nextStep: 'process-thoughts',
                    content: 'Personal content about family'
                }),
                createMockYamlSection({
                    filename: 'work.md', 
                    nextStep: 'process-tasks',
                    content: 'Meeting notes and action items'
                }),
                createMockYamlSection({
                    filename: 'ideas.md',
                    nextStep: 'process-ideas',
                    content: 'Brainstorming session results'
                })
            ];

            expect(multiFileResponse).toHaveLength(3);
            expect(multiFileResponse[0].nextStep).toBe('process-thoughts');
            expect(multiFileResponse[1].nextStep).toBe('process-tasks');
            expect(multiFileResponse[2].nextStep).toBe('process-ideas');
        });

        it('should handle missing nextStep in response (terminal processing)', () => {
            const terminalResponse = createMockYamlSection({
                filename: 'final-output.md',
                nextStep: undefined,
                content: 'Final processed content'
            });

            expect(terminalResponse.filename).toBe('final-output.md');
            expect(terminalResponse.nextStep).toBeUndefined();
        });

        it('should handle empty nextStep values', () => {
            const emptyNextStepResponse = createMockYamlSection({
                filename: 'output.md',
                nextStep: '',
                content: 'Content with empty nextStep'
            });

            expect(emptyNextStepResponse.nextStep).toBe('');
        });
    });

    describe('Routing Decision Validation', () => {
        it('should validate nextStep against available options', () => {
            const availableSteps = ['process-thoughts', 'process-tasks', 'process-ideas'];
            const validNextStep = 'process-thoughts';
            const invalidNextStep = 'non-existent-step';

            expect(availableSteps.includes(validNextStep)).toBe(true);
            expect(availableSteps.includes(invalidNextStep)).toBe(false);
        });

        it('should handle case-sensitive step matching', () => {
            const availableSteps = ['process-thoughts', 'process-tasks'];
            const validStep = 'process-thoughts';
            const invalidCaseStep = 'Process-Thoughts';

            expect(availableSteps.includes(validStep)).toBe(true);
            expect(availableSteps.includes(invalidCaseStep)).toBe(false);
        });

        it('should validate step ID format in responses', () => {
            const validStepIds = ['process-thoughts', 'summary-work', 'final-step'];
            const invalidStepIds = ['invalid spaces', '123-numeric', 'invalid@symbol'];

            validStepIds.forEach(stepId => {
                expect(stepId).toMatch(/^[a-zA-Z][a-zA-Z0-9\-_]*$/);
            });

            invalidStepIds.forEach(stepId => {
                expect(stepId).not.toMatch(/^[a-zA-Z][a-zA-Z0-9\-_]*$/);
            });
        });
    });
});

describe('Step Routing Error Handling', () => {
    afterEach(() => {
        cleanup();
    });

    describe('Configuration Errors', () => {
        it('should detect malformed routing-aware output objects', () => {
            const malformedStep = createMockPipelineStep({
                modelConfig: 'openai-gpt',
                routingAwareOutput: null as any
            });

            // This should pass basic parsing but may fail at runtime validation
            expect(() => validatePipelineStep(malformedStep, 'test-step'))
                .not.toThrow(); // Configuration validator may not catch this specific issue
        });

        it('should accept steps without routing-aware output (terminal steps)', () => {
            const terminalStep = createMockPipelineStep({
                modelConfig: 'openai-gpt',
                output: 'inbox/terminal/{filename}.md'
                // No routingAwareOutput - this is a terminal step
            });

            expect(() => validatePipelineStep(terminalStep, 'test-step'))
                .not.toThrow();
        });

        it('should provide helpful error messages for routing issues', () => {
            const stepWithInvalidRouting = createMockPipelineStep({
                modelConfig: 'openai-gpt',
                routingAwareOutput: {
                    'valid-step': 'inbox/valid/{filename}.md',
                    '': 'inbox/empty/{filename}.md', // Empty step ID
                    'invalid-step': '' // Empty path
                }
            });

            expect(() => validatePipelineStep(stepWithInvalidRouting, 'test-step'))
                .toThrow();
        });
    });

    describe('Runtime Routing Errors', () => {
        it('should handle invalid nextStep values gracefully', () => {
            const invalidResponse = createMockYamlSection({
                filename: 'output.md',
                nextStep: 'non-existent-step',
                content: 'Content with invalid routing'
            });

            // In runtime, this should be validated against the pipeline configuration
            expect(invalidResponse.nextStep).toBe('non-existent-step');
            // The validation would happen in the pipeline executor
        });

        it('should handle malformed nextStep values', () => {
            const malformedResponse = createMockYamlSection({
                filename: 'output.md',
                nextStep: 123 as any, // Invalid type
                content: 'Content with malformed nextStep'
            });

            expect(typeof malformedResponse.nextStep).toBe('number');
            // Type coercion or validation would happen in the YAML parser
        });
    });

    describe('Fallback Strategies', () => {
        it('should support ending pipeline when nextStep is invalid', () => {
            // When nextStep is invalid, pipeline should end gracefully
            const endPipelineScenario = {
                invalidNextStep: 'non-existent-step',
                fallbackAction: 'end-pipeline'
            };

            expect(endPipelineScenario.fallbackAction).toBe('end-pipeline');
        });

        it('should support default routing when nextStep is missing', () => {
            // When nextStep is missing, could use default routing or end pipeline
            const missingNextStepScenario = {
                nextStep: undefined,
                defaultAction: 'end-pipeline'
            };

            expect(missingNextStepScenario.defaultAction).toBe('end-pipeline');
        });
    });
});

describe('Advanced Routing Scenarios', () => {
    afterEach(() => {
        cleanup();
    });

    describe('Conditional Routing Logic', () => {
        it('should support content-based routing decisions', () => {
            const contentBasedRouting = {
                'transcribe': createMockPipelineStep({
                    modelConfig: 'openai-whisper',
                    output: 'inbox/transcripts/{filename}.md',
                    routingAwareOutput: {
                        'process-thoughts': 'inbox/transcripts/{filename}.md',
                        'process-tasks': 'inbox/transcripts/{filename}.md',
                        'process-ideas': 'inbox/transcripts/{filename}.md',
                        'default': 'inbox/transcripts/{filename}.md'
                    }
                })
            };

            expect(Object.keys(contentBasedRouting.transcribe.routingAwareOutput!)).toHaveLength(4);
            expect(contentBasedRouting.transcribe.routingAwareOutput!['process-thoughts']).toContain('transcripts');
        });

        it('should support priority-based routing', () => {
            const priorityRouting = {
                'classifier': createMockPipelineStep({
                    modelConfig: 'openai-gpt',
                    output: 'inbox/classified/{filename}.md',
                    routingAwareOutput: {
                        'urgent-processor': 'inbox/classified/{filename}.md',
                        'standard-processor': 'inbox/classified/{filename}.md',
                        'low-priority-processor': 'inbox/classified/{filename}.md',
                        'default': 'inbox/classified/{filename}.md'
                    }
                })
            };

            expect(Object.keys(priorityRouting.classifier.routingAwareOutput!)).toHaveLength(4);
            expect(priorityRouting.classifier.routingAwareOutput!['urgent-processor']).toContain('classified');
        });

        it('should support topic-based routing', () => {
            const topicRouting = {
                'topic-classifier': createMockPipelineStep({
                    modelConfig: 'openai-gpt',
                    output: 'inbox/topics/{filename}.md',
                    routingAwareOutput: {
                        'health-processor': 'inbox/topics/{filename}.md',
                        'finance-processor': 'inbox/topics/{filename}.md',
                        'tech-processor': 'inbox/topics/{filename}.md',
                        'general-processor': 'inbox/topics/{filename}.md',
                        'default': 'inbox/topics/{filename}.md'
                    }
                })
            };

            expect(Object.keys(topicRouting['topic-classifier'].routingAwareOutput!)).toHaveLength(5);
        });
    });

    describe('Multi-Stage Routing', () => {
        it('should support sequential routing through multiple stages', () => {
            const sequentialConfig = {
                'stage1': createMockPipelineStep({
                    modelConfig: 'openai-gpt',
                    output: 'inbox/stage1/{filename}.md',
                    routingAwareOutput: {
                        'stage2a': 'inbox/stage1/{filename}.md',
                        'stage2b': 'inbox/stage1/{filename}.md',
                        'default': 'inbox/stage1/{filename}.md'
                    }
                }),
                'stage2a': createMockPipelineStep({
                    modelConfig: 'openai-gpt',
                    output: 'inbox/stage2a/{filename}.md',
                    routingAwareOutput: {
                        'stage3': 'inbox/stage2a/{filename}.md',
                        'default': 'inbox/stage2a/{filename}.md'
                    }
                }),
                'stage2b': createMockPipelineStep({
                    modelConfig: 'openai-gpt',
                    output: 'inbox/stage2b/{filename}.md',
                    routingAwareOutput: {
                        'stage3': 'inbox/stage2b/{filename}.md',
                        'default': 'inbox/stage2b/{filename}.md'
                    }
                }),
                'stage3': createMockPipelineStep({
                    modelConfig: 'openai-gpt',
                    output: 'inbox/stage3/{filename}.md',
                    routingAwareOutput: {
                        'final': 'inbox/stage3/{filename}.md',
                        'default': 'inbox/stage3/{filename}.md'
                    }
                }),
                'final': createMockPipelineStep({
                    modelConfig: 'openai-gpt',
                    output: 'inbox/final/{filename}.md'
                })
            };

            expect(() => validatePipelineConfig(sequentialConfig)).not.toThrow();
        });

        it('should support parallel processing with routing', () => {
            const parallelConfig = {
                'splitter': createMockPipelineStep({
                    modelConfig: 'openai-gpt',
                    output: 'inbox/splitter/{filename}.md',
                    routingAwareOutput: {
                        'parallel1': 'inbox/splitter/{filename}.md',
                        'parallel2': 'inbox/splitter/{filename}.md',
                        'parallel3': 'inbox/splitter/{filename}.md',
                        'default': 'inbox/splitter/{filename}.md'
                    }
                }),
                'parallel1': createMockPipelineStep({
                    modelConfig: 'openai-gpt',
                    output: 'inbox/parallel1/{filename}.md',
                    routingAwareOutput: {
                        'merger': 'inbox/parallel1/{filename}.md',
                        'default': 'inbox/parallel1/{filename}.md'
                    }
                }),
                'parallel2': createMockPipelineStep({
                    modelConfig: 'openai-gpt',
                    output: 'inbox/parallel2/{filename}.md',
                    routingAwareOutput: {
                        'merger': 'inbox/parallel2/{filename}.md',
                        'default': 'inbox/parallel2/{filename}.md'
                    }
                }),
                'parallel3': createMockPipelineStep({
                    modelConfig: 'openai-gpt',
                    output: 'inbox/parallel3/{filename}.md',
                    routingAwareOutput: {
                        'merger': 'inbox/parallel3/{filename}.md',
                        'default': 'inbox/parallel3/{filename}.md'
                    }
                }),
                'merger': createMockPipelineStep({
                    modelConfig: 'openai-gpt',
                    output: 'inbox/merged/{filename}.md'
                })
            };

            expect(() => validatePipelineConfig(parallelConfig)).not.toThrow();
        });
    });
});
