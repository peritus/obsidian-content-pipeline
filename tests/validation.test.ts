/**
 * Validation System Tests
 * 
 * Comprehensive test suite for all validation modules updated for v2.0 schema.
 * Updated for routing-aware output system without legacy 'next' field.
 */

import { 
    Validators, 
    validateCommon,
    validatePath,
    validateApiKey,
    validateFilePattern,
    validatePipelineStep,
    validatePipelineConfig
} from '../src/validation';
import { createMockPipelineStep, createMockPipelineConfig, cleanup } from './setup';

describe('Path Validation', () => {
    afterEach(() => {
        cleanup();
    });

    describe('validatePath', () => {
        it('should accept valid vault-relative paths', () => {
            expect(() => validatePath('inbox/audio', 'test path')).not.toThrow();
            expect(() => validatePath('valid/path/file.md', 'test path')).not.toThrow();
            expect(() => validatePath('simple.md', 'test path')).not.toThrow();
        });

        it('should reject empty paths', () => {
            expect(() => validatePath('', 'test path')).toThrow('Empty path provided');
            expect(() => validatePath('   ', 'test path')).toThrow('cannot be empty');
        });

        it('should reject absolute paths', () => {
            expect(() => validatePath('/absolute/path', 'test path')).toThrow('must be relative');
            expect(() => validatePath('C:\\windows\\path', 'test path')).toThrow('must be relative');
        });

        it('should reject path traversal attempts', () => {
            expect(() => validatePath('../parent/path', 'test path')).toThrow('path traversal');
            expect(() => validatePath('valid/../invalid', 'test path')).toThrow('path traversal');
            expect(() => validatePath('..\\windows\\path', 'test path')).toThrow('path traversal');
        });

        it('should reject invalid characters', () => {
            expect(() => validatePath('path<with>invalid', 'test path')).toThrow('invalid characters');
            expect(() => validatePath('path|with|pipes', 'test path')).toThrow('invalid characters');
            expect(() => validatePath('path:with:colons', 'test path')).toThrow('invalid characters');
        });

        it('should reject paths that are too long', () => {
            const longPath = 'a'.repeat(300);
            expect(() => validatePath(longPath, 'test path')).toThrow('too long');
        });

        it('should reject paths with double slashes', () => {
            expect(() => validatePath('path//with//double', 'test path')).toThrow('double slashes');
        });

        it('should reject null bytes', () => {
            expect(() => validatePath('path\0with\0null', 'test path')).toThrow('null character');
        });
    });
});

describe('API Key Validation', () => {
    afterEach(() => {
        cleanup();
    });

    describe('validateApiKey', () => {
        it('should accept valid OpenAI project API keys', () => {
            expect(() => validateApiKey('sk-proj-1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef')).not.toThrow();
            expect(() => validateApiKey('sk-proj-EtmK85nkAcIvMoYjOu1234SoPVBWnYOjHGUQx--HUh4OW3syW_zfYcCRbrbtxeX4ZJCDJY8tb88f_MDovZwA')).not.toThrow();
        });

        it('should accept valid Anthropic API keys', () => {
            const anthropicKey = 'sk-ant-api03-' + 'a'.repeat(95);
            expect(() => validateApiKey(anthropicKey)).not.toThrow();
        });

        it('should accept generic API keys', () => {
            expect(() => validateApiKey('valid-api-key-123')).not.toThrow();
            expect(() => validateApiKey('some_long_api_key_with_underscores_123456789')).not.toThrow();
        });

        it('should reject empty API keys', () => {
            expect(() => validateApiKey('')).toThrow('cannot be empty');
            expect(() => validateApiKey('   ')).toThrow('cannot be empty');
        });

        it('should reject API keys with whitespace', () => {
            expect(() => validateApiKey(' sk-test-key ')).toThrow('cannot contain spaces');
            expect(() => validateApiKey('sk-test key-with-space')).toThrow('cannot contain spaces');
        });

        it('should reject API keys that are too short', () => {
            expect(() => validateApiKey('short')).toThrow('too short');
        });

        it('should reject API keys that are too long', () => {
            const longKey = 'sk-' + 'a'.repeat(300);
            expect(() => validateApiKey(longKey)).toThrow('too long');
        });

        it('should reject API keys with quotes', () => {
            expect(() => validateApiKey('"sk-test-key"')).toThrow('should not include quotation marks');
            expect(() => validateApiKey("'sk-test-key'")).toThrow('should not include quotation marks');
        });

        it('should reject placeholder API keys', () => {
            expect(() => validateApiKey('your_api_key')).toThrow('placeholder');
            expect(() => validateApiKey('sk-your-key')).toThrow('placeholder');
        });

        it('should reject invalid format', () => {
            expect(() => validateApiKey('invalid@#$%^&*()')).toThrow('format is not recognized');
        });

        it('should reject legacy OpenAI API key format', () => {
            expect(() => validateApiKey('sk-123456789012345678901234567890123456789012345678')).toThrow('Legacy OpenAI API key format not supported');
        });
    });
});

describe('File Pattern Validation', () => {
    afterEach(() => {
        cleanup();
    });

    describe('validateFilePattern', () => {
        it('should accept valid file patterns', () => {
            expect(() => validateFilePattern('inbox/{filename}.md')).not.toThrow();
            expect(() => validateFilePattern('static/path/file.txt')).not.toThrow();
            expect(() => validateFilePattern('{stepId}/{date}/{timestamp}.log')).not.toThrow();
        });

        it('should reject empty patterns', () => {
            expect(() => validateFilePattern('')).toThrow('cannot be empty');
        });

        it('should reject path traversal in patterns', () => {
            expect(() => validateFilePattern('../{stepId}/file.md')).toThrow('path traversal');
            expect(() => validateFilePattern('inbox/../{stepId}')).toThrow('path traversal');
        });

        it('should reject absolute patterns', () => {
            expect(() => validateFilePattern('/inbox/{stepId}')).toThrow('must be relative');
            expect(() => validateFilePattern('C:\\inbox\\{stepId}')).toThrow('must be relative');
        });

        it('should reject invalid variables', () => {
            expect(() => validateFilePattern('inbox/{invalidVar}')).toThrow('File pattern contains unsupported variables');
            expect(() => validateFilePattern('{stepId}/{invalid}/{filename}')).toThrow('File pattern contains unsupported variables');
        });

        it('should reject malformed variable syntax', () => {
            expect(() => validateFilePattern('inbox/{unclosed')).toThrow('File pattern contains unmatched brackets');
            expect(() => validateFilePattern('inbox/unopened}')).toThrow('File pattern contains unmatched brackets');
            expect(() => validateFilePattern('inbox/{}')).toThrow('File pattern contains empty variable');
        });

        it('should reject invalid characters', () => {
            expect(() => validateFilePattern('inbox/<invalid>')).toThrow('invalid characters');
            expect(() => validateFilePattern('inbox/file|name')).toThrow('invalid characters');
        });

        it('should reject patterns that are too long', () => {
            const longPattern = 'inbox/' + 'a'.repeat(500);
            expect(() => validateFilePattern(longPattern)).toThrow('too long');
        });

        it('should reject double slashes', () => {
            expect(() => validateFilePattern('inbox//{stepId}')).toThrow('double slashes');
        });

        it('should suggest file extensions for filename patterns', () => {
            expect(() => validateFilePattern('inbox/{filename}')).toThrow('should include file extension');
        });
    });
});

describe('Pipeline Step Validation', () => {
    afterEach(() => {
        cleanup();
    });

    describe('validatePipelineStep', () => {
        it('should accept valid pipeline steps', () => {
            const step = createMockPipelineStep();
            expect(() => validatePipelineStep(step, 'test-step')).not.toThrow();
        });

        it('should reject invalid or missing step configuration', () => {
            expect(() => validatePipelineStep(null as any, 'test-step')).toThrow('missing or invalid');
            expect(() => validatePipelineStep({} as any, 'test-step')).toThrow('missing required fields');
        });

        it('should reject missing required fields', () => {
            const step = createMockPipelineStep();
            delete (step as any).modelConfig;
            
            expect(() => validatePipelineStep(step, 'test-step')).toThrow('missing required fields');
        });

        it('should reject invalid model config format', () => {
            const step = createMockPipelineStep({ modelConfig: '' });
            expect(() => validatePipelineStep(step, 'test-step')).toThrow('Step test-step is missing required fields: modelConfig');

            // Test invalid format (note: this tests format validation, not existence validation)
            const step2 = createMockPipelineStep({ modelConfig: 'Invalid Model Config!' });
            expect(() => validatePipelineStep(step2, 'test-step')).toThrow('Invalid modelConfig format in step test-step');
        });

        it('should validate input, output, and archive patterns', () => {
            const step = createMockPipelineStep({ input: '../invalid' });
            expect(() => validatePipelineStep(step, 'test-step')).toThrow('input pattern is invalid');
        });

        it('should validate prompts and context arrays', () => {
            // Test with properly typed invalid values for prompts
            const invalidStep: any = createMockPipelineStep();
            invalidStep.prompts = 'not-an-array';
            expect(() => validatePipelineStep(invalidStep, 'test-step')).toThrow('prompts field must be an array');

            const invalidStep2: any = createMockPipelineStep();
            invalidStep2.prompts = [123];
            expect(() => validatePipelineStep(invalidStep2, 'test-step')).toThrow('prompt file paths must be strings');

            // Test with properly typed invalid values for context
            const invalidStep3: any = createMockPipelineStep();
            invalidStep3.context = 'not-an-array';
            expect(() => validatePipelineStep(invalidStep3, 'test-step')).toThrow('context field must be an array');

            const invalidStep4: any = createMockPipelineStep();
            invalidStep4.context = [123];
            expect(() => validatePipelineStep(invalidStep4, 'test-step')).toThrow('context file paths must be strings');
        });

        it('should validate routing-aware output configuration', () => {
            const step = createMockPipelineStep({ 
                routingAwareOutput: { 
                    'valid-step': 'inbox/valid/{filename}.md',
                    'default': 'inbox/default/{filename}.md'
                }
            });
            expect(() => validatePipelineStep(step, 'test-step')).not.toThrow();
        });

        it('should reject invalid routing-aware output format', () => {
            // Test with properly typed invalid values
            const invalidStep: any = createMockPipelineStep();
            invalidStep.routingAwareOutput = 'string-instead-of-object';
            expect(() => validatePipelineStep(invalidStep, 'test-step')).toThrow();

            const invalidStep2: any = createMockPipelineStep();
            invalidStep2.routingAwareOutput = ['array-instead-of-object'];
            expect(() => validatePipelineStep(invalidStep2, 'test-step')).toThrow();
        });

        it('should validate routing-aware output paths', () => {
            const step = createMockPipelineStep({ 
                routingAwareOutput: { 
                    'step-id': '', // Empty path
                    'default': 'inbox/default/{filename}.md'
                }
            });
            expect(() => validatePipelineStep(step, 'test-step')).toThrow();

            const step2 = createMockPipelineStep({ 
                routingAwareOutput: { 
                    '': 'inbox/empty/{filename}.md', // Empty step ID
                    'default': 'inbox/default/{filename}.md'
                }
            });
            expect(() => validatePipelineStep(step2, 'test-step')).toThrow();
        });

        it('should accept valid description field', () => {
            const step = createMockPipelineStep({ 
                description: 'This step processes audio files'
            });
            expect(() => validatePipelineStep(step, 'test-step')).not.toThrow();
        });
    });
});

describe('Pipeline Configuration Validation', () => {
    afterEach(() => {
        cleanup();
    });

    describe('validatePipelineConfig', () => {
        it('should accept valid pipeline configurations', () => {
            const config = createMockPipelineConfig();
            expect(() => validatePipelineConfig(config)).not.toThrow();
        });

        it('should reject invalid configuration objects', () => {
            expect(() => validatePipelineConfig(null as any)).toThrow('must be a valid object');
            expect(() => validatePipelineConfig({} as any)).toThrow('cannot be empty');
        });

        it('should validate individual steps', () => {
            const invalidStep: any = { }; // Completely invalid step
            const config = createMockPipelineConfig({
                'invalid-step': invalidStep
            });
            expect(() => validatePipelineConfig(config)).toThrow('configuration is invalid');
        });

        it('should validate step ID format', () => {
            const config: any = {
                '123-invalid': createMockPipelineStep()
            };
            expect(() => validatePipelineConfig(config)).toThrow('must start with a letter');
        });

        it('should detect invalid step references in routing-aware output', () => {
            const config = createMockPipelineConfig({
                'step1': createMockPipelineStep({ 
                    routingAwareOutput: { 
                        'non-existent-step': 'inbox/non-existent/{filename}.md',
                        'default': 'inbox/default/{filename}.md'
                    }
                })
            });
            expect(() => validatePipelineConfig(config)).toThrow('Step step1 references non-existent step');
        });

        it('should detect circular references with routing-aware output', () => {
            const config = {
                'step1': createMockPipelineStep({ 
                    routingAwareOutput: { 
                        'step2': 'inbox/step1/{filename}.md',
                        'default': 'inbox/step1/{filename}.md'
                    }
                }),
                'step2': createMockPipelineStep({ 
                    routingAwareOutput: { 
                        'step1': 'inbox/step2/{filename}.md',
                        'default': 'inbox/step2/{filename}.md'
                    }
                })
            };
            expect(() => validatePipelineConfig(config)).toThrow('circular references');
        });

        it('should ensure entry points exist', () => {
            // Create a scenario where all steps reference each other but there are no cycles
            // This is actually impossible in a finite system, so we test circular reference detection
            const config = {
                'step1': createMockPipelineStep({ 
                    routingAwareOutput: { 
                        'step2': 'inbox/step1/{filename}.md',
                        'default': 'inbox/step1/{filename}.md'
                    }
                }),
                'step2': createMockPipelineStep({ 
                    routingAwareOutput: { 
                        'step1': 'inbox/step2/{filename}.md',
                        'default': 'inbox/step2/{filename}.md'
                    }
                })
            };
            // Since no entry points logically implies circular references in finite systems,
            // we expect circular reference detection to catch this
            expect(() => validatePipelineConfig(config)).toThrow('circular references');
        });

        it('should detect orphaned steps', () => {
            const config = {
                'entry': createMockPipelineStep({ 
                    input: 'inbox/input/{filename}.md', // Entry point (has input)
                    routingAwareOutput: { 
                        'connected': 'inbox/entry/{filename}.md',
                        'default': 'inbox/entry/{filename}.md'
                    }
                }),
                'connected': createMockPipelineStep({
                    // Remove input field - this step can only be reached via routing
                    input: undefined
                }),
                'orphaned': createMockPipelineStep({
                    // Remove input field - this makes it truly orphaned
                    input: undefined
                }) // This step is never referenced AND has no input field
            };
            expect(() => validatePipelineConfig(config)).toThrow('orphaned steps');
        });

        it('should limit pipeline size', () => {
            const config: any = {};
            for (let i = 0; i < 25; i++) {
                config[`step${i}`] = createMockPipelineStep();
            }
            expect(() => validatePipelineConfig(config)).toThrow('too many pipeline steps');
        });

        it('should validate complex routing-aware output configurations', () => {
            const config = {
                'transcribe': createMockPipelineStep({
                    modelConfig: 'openai-whisper',
                    routingAwareOutput: {
                        'process-thoughts': 'inbox/transcripts/{filename}.md',
                        'process-tasks': 'inbox/transcripts/{filename}.md',
                        'process-ideas': 'inbox/transcripts/{filename}.md',
                        'default': 'inbox/transcripts/{filename}.md'
                    }
                }),
                'process-thoughts': createMockPipelineStep({
                    modelConfig: 'openai-gpt',
                    routingAwareOutput: {
                        'summary-personal': 'inbox/thoughts/{filename}.md',
                        'default': 'inbox/thoughts/{filename}.md'
                    }
                }),
                'process-tasks': createMockPipelineStep({
                    modelConfig: 'openai-gpt',
                    routingAwareOutput: {
                        'summary-work': 'inbox/tasks/{filename}.md',
                        'default': 'inbox/tasks/{filename}.md'
                    }
                }),
                'process-ideas': createMockPipelineStep({
                    modelConfig: 'openai-gpt',
                    routingAwareOutput: {
                        'summary-personal': 'inbox/ideas/{filename}-personal.md',
                        'summary-work': 'inbox/ideas/{filename}-work.md',
                        'default': 'inbox/ideas/{filename}.md'
                    }
                }),
                'summary-personal': createMockPipelineStep({
                    modelConfig: 'openai-gpt'
                }),
                'summary-work': createMockPipelineStep({
                    modelConfig: 'openai-gpt'
                })
            };
            
            expect(() => validatePipelineConfig(config)).not.toThrow();
        });
    });
});

describe('Validators Object', () => {
    afterEach(() => {
        cleanup();
    });

    it('should expose all validation functions except category', () => {
        expect(typeof Validators.path).toBe('function');
        expect(typeof Validators.apiKey).toBe('function');
        expect(typeof Validators.filePattern).toBe('function');
        expect(typeof Validators.pipelineStep).toBe('function');
        expect(typeof Validators.pipelineConfig).toBe('function');
        
        // Category validation should no longer exist in v2.0 schema
        expect('category' in Validators).toBe(false);
    });

    it('should work the same as individual imports', () => {
        // Test that the object methods work the same as direct imports
        expect(() => Validators.path('valid/path', 'test')).not.toThrow();
        expect(() => Validators.filePattern('valid/{filename}.md')).not.toThrow();
    });
});

describe('validateCommon', () => {
    afterEach(() => {
        cleanup();
    });

    it('should validate multiple inputs at once', () => {
        const data = {
            path: 'valid/path.md',
            apiKey: 'sk-proj-1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
            filePattern: 'inbox/{filename}.md'
        };

        expect(() => validateCommon(data)).not.toThrow();
        expect(validateCommon(data)).toBe(true);
    });

    it('should skip validation for undefined fields', () => {
        const data = {
            path: 'valid/path.md'
            // other fields undefined
        };

        expect(() => validateCommon(data)).not.toThrow();
    });

    it('should fail if any validation fails', () => {
        const data = {
            path: '../invalid/path',
            apiKey: 'valid-api-key-123'
        };

        expect(() => validateCommon(data)).toThrow();
    });

    it('should no longer include category validation', () => {
        const data = {
            path: 'valid/path.md',
            // category field should be ignored since it's no longer validated
            category: 'some-category-value'
        };

        expect(() => validateCommon(data)).not.toThrow();
    });
});

describe('Routing-Aware Output Validation', () => {
    afterEach(() => {
        cleanup();
    });

    describe('Routing-Aware Output Structure', () => {
        it('should validate well-formed routing-aware output objects', () => {
            const step = createMockPipelineStep({
                routingAwareOutput: {
                    'step1': 'inbox/step1/{filename}.md',
                    'step2': 'inbox/step2/{filename}.md',
                    'step3': 'inbox/step3/{filename}.md',
                    'default': 'inbox/default/{filename}.md'
                }
            });
            
            expect(() => validatePipelineStep(step, 'test-step')).not.toThrow();
        });

        it('should accept steps without routing-aware output (terminal steps)', () => {
            const step = createMockPipelineStep({
                output: 'inbox/terminal/{filename}.md'
                // No routingAwareOutput - terminal step
            });
            
            expect(() => validatePipelineStep(step, 'test-step')).not.toThrow();
        });

        it('should reject non-string step IDs in routing-aware output', () => {
            const invalidStep: any = createMockPipelineStep();
            invalidStep.routingAwareOutput = {
                123: 'inbox/numeric/{filename}.md'
            };
            
            expect(() => validatePipelineStep(invalidStep, 'test-step')).toThrow();
        });

        it('should reject non-string output paths in routing-aware output', () => {
            const invalidStep: any = createMockPipelineStep();
            invalidStep.routingAwareOutput = {
                'valid-step': 123
            };
            
            expect(() => validatePipelineStep(invalidStep, 'test-step')).toThrow();
        });

        it('should validate step ID format in routing-aware output', () => {
            const step = createMockPipelineStep({
                routingAwareOutput: {
                    'valid-step-id': 'inbox/valid/{filename}.md',
                    'invalid step id': 'inbox/invalid/{filename}.md',
                    'default': 'inbox/default/{filename}.md'
                }
            });
            
            expect(() => validatePipelineStep(step, 'test-step')).toThrow('invalid step ID format');
        });
    });
});
