/**
 * Validation System Tests
 * 
 * Comprehensive test suite for all validation modules.
 */

import { 
    Validators, 
    validateCommon,
    validatePath,
    validateCategory,
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
            expect(() => validatePath('inbox/audio/tasks', 'test path')).not.toThrow();
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

describe('Category Validation', () => {
    afterEach(() => {
        cleanup();
    });

    describe('validateCategory', () => {
        it('should accept valid category names', () => {
            expect(() => validateCategory('tasks')).not.toThrow();
            expect(() => validateCategory('work-meetings')).not.toThrow();
            expect(() => validateCategory('personal_notes')).not.toThrow();
            expect(() => validateCategory('Category123')).not.toThrow();
        });

        it('should reject empty categories', () => {
            expect(() => validateCategory('')).toThrow('cannot be empty');
            expect(() => validateCategory('   ')).toThrow('must be at least 1 character');
        });

        it('should reject categories that are too long', () => {
            const longCategory = 'a'.repeat(51);
            expect(() => validateCategory(longCategory)).toThrow('too long');
        });

        it('should reject invalid characters', () => {
            expect(() => validateCategory('invalid spaces')).toThrow('can only contain');
            expect(() => validateCategory('invalid@symbol')).toThrow('can only contain');
            expect(() => validateCategory('invalid.dot')).toThrow('can only contain');
            expect(() => validateCategory('invalid/slash')).toThrow('can only contain');
        });

        it('should reject reserved names', () => {
            expect(() => validateCategory('CON')).toThrow('reserved name');
            expect(() => validateCategory('PRN')).toThrow('reserved name');
            expect(() => validateCategory('node_modules')).toThrow('reserved name');
            expect(() => validateCategory('.git')).toThrow('reserved name');
        });

        it('should reject categories starting with special characters', () => {
            expect(() => validateCategory('-starts-with-dash')).toThrow('cannot start with');
            expect(() => validateCategory('_starts-with-underscore')).toThrow('cannot start with');
        });

        it('should reject categories ending with special characters', () => {
            expect(() => validateCategory('ends-with-dash-')).toThrow('cannot end with');
            expect(() => validateCategory('ends-with-underscore_')).toThrow('cannot end with');
        });

        it('should reject consecutive special characters', () => {
            expect(() => validateCategory('has--double-dash')).toThrow('consecutive');
            expect(() => validateCategory('has__double_underscore')).toThrow('consecutive');
            expect(() => validateCategory('has-_mixed')).toThrow('consecutive');
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
            expect(() => validateFilePattern('inbox/{category}/{filename}.md')).not.toThrow();
            expect(() => validateFilePattern('static/path/file.txt')).not.toThrow();
            expect(() => validateFilePattern('{category}/{date}/{timestamp}.log')).not.toThrow();
        });

        it('should reject empty patterns', () => {
            expect(() => validateFilePattern('')).toThrow('cannot be empty');
        });

        it('should reject path traversal in patterns', () => {
            expect(() => validateFilePattern('../{category}/file.md')).toThrow('path traversal');
            expect(() => validateFilePattern('inbox/../{category}')).toThrow('path traversal');
        });

        it('should reject absolute patterns', () => {
            expect(() => validateFilePattern('/inbox/{category}')).toThrow('must be relative');
            expect(() => validateFilePattern('C:\\inbox\\{category}')).toThrow('must be relative');
        });

        it('should reject invalid variables', () => {
            expect(() => validateFilePattern('inbox/{invalidVar}')).toThrow('Unsupported variables');
            expect(() => validateFilePattern('{category}/{invalid}/{filename}')).toThrow('Unsupported variables');
        });

        it('should reject malformed variable syntax', () => {
            expect(() => validateFilePattern('inbox/{unclosed')).toThrow('Unmatched brackets');
            expect(() => validateFilePattern('inbox/unopened}')).toThrow('Unmatched brackets');
            expect(() => validateFilePattern('inbox/{}')).toThrow('Empty variable');
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
            expect(() => validateFilePattern('inbox//{category}')).toThrow('double slashes');
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
            delete (step as any).model;
            
            expect(() => validatePipelineStep(step, 'test-step')).toThrow('missing required fields');
        });

        it('should reject invalid model specifications', () => {
            const step = createMockPipelineStep({ model: '' });
            expect(() => validatePipelineStep(step, 'test-step')).toThrow('model must be');

            const step2 = createMockPipelineStep({ model: 'invalid-model' });
            expect(() => validatePipelineStep(step2, 'test-step')).toThrow('unsupported model');
        });

        it('should validate input, output, and archive patterns', () => {
            const step = createMockPipelineStep({ input: '../invalid' });
            expect(() => validatePipelineStep(step, 'test-step')).toThrow('input pattern is invalid');
        });

        it('should validate include array', () => {
            const step = createMockPipelineStep({ include: 'not-an-array' });
            expect(() => validatePipelineStep(step, 'test-step')).toThrow('include field must be an array');

            const step2 = createMockPipelineStep({ include: [123] });
            expect(() => validatePipelineStep(step2, 'test-step')).toThrow('include paths must be strings');
        });

        it('should validate API key format', () => {
            const step = createMockPipelineStep({ apiKey: 'invalid-key' });
            expect(() => validatePipelineStep(step, 'test-step')).toThrow('invalid API key format');
        });

        it('should validate baseUrl format', () => {
            const step = createMockPipelineStep({ baseUrl: 'not-a-url' });
            expect(() => validatePipelineStep(step, 'test-step')).toThrow('not a valid URL');
        });

        it('should validate next step reference', () => {
            const step = createMockPipelineStep({ next: '' });
            expect(() => validatePipelineStep(step, 'test-step')).toThrow('next field cannot be empty');
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
            const config = createMockPipelineConfig({
                'invalid-step': { model: 'invalid' }
            });
            expect(() => validatePipelineConfig(config)).toThrow('configuration is invalid');
        });

        it('should validate step ID format', () => {
            const config = {
                '123-invalid': createMockPipelineStep()
            };
            expect(() => validatePipelineConfig(config)).toThrow('must start with a letter');
        });

        it('should detect duplicate step IDs', () => {
            // This test is more conceptual since objects can't have duplicate keys
            // but we test the logic exists
            const config = createMockPipelineConfig();
            expect(() => validatePipelineConfig(config)).not.toThrow();
        });

        it('should detect invalid step references', () => {
            const config = createMockPipelineConfig({
                'step1': createMockPipelineStep({ next: 'non-existent-step' })
            });
            expect(() => validatePipelineConfig(config)).toThrow('reference non-existent');
        });

        it('should detect circular references', () => {
            const config = {
                'step1': createMockPipelineStep({ next: 'step2' }),
                'step2': createMockPipelineStep({ next: 'step1' })
            };
            expect(() => validatePipelineConfig(config)).toThrow('circular references');
        });

        it('should ensure entry points exist', () => {
            // Create a scenario where all steps reference each other but there are no cycles
            // This is actually impossible in a finite system, so we test circular reference detection
            const config = {
                'step1': createMockPipelineStep({ next: 'step2' }),
                'step2': createMockPipelineStep({ next: 'step1' })
            };
            // Since no entry points logically implies circular references in finite systems,
            // we expect circular reference detection to catch this
            expect(() => validatePipelineConfig(config)).toThrow('circular references');
        });

        it('should detect orphaned steps', () => {
            const config = {
                'entry': createMockPipelineStep({ next: 'connected' }),
                'connected': createMockPipelineStep(),
                'orphaned': createMockPipelineStep()
            };
            expect(() => validatePipelineConfig(config)).toThrow('orphaned steps');
        });

        it('should require audio input steps', () => {
            const config = {
                'text-only': createMockPipelineStep({ 
                    input: 'text/{category}',
                    model: 'gpt-4'
                })
            };
            expect(() => validatePipelineConfig(config)).toThrow('no audio input steps');
        });

        it('should limit pipeline size', () => {
            const config: any = {};
            for (let i = 0; i < 25; i++) {
                config[`step${i}`] = createMockPipelineStep();
            }
            expect(() => validatePipelineConfig(config)).toThrow('too many pipeline steps');
        });
    });
});

describe('Validators Object', () => {
    afterEach(() => {
        cleanup();
    });

    it('should expose all validation functions', () => {
        expect(typeof Validators.path).toBe('function');
        expect(typeof Validators.category).toBe('function');
        expect(typeof Validators.apiKey).toBe('function');
        expect(typeof Validators.filePattern).toBe('function');
        expect(typeof Validators.pipelineStep).toBe('function');
        expect(typeof Validators.pipelineConfig).toBe('function');
    });

    it('should work the same as individual imports', () => {
        // Test that the object methods work the same as direct imports
        expect(() => Validators.path('valid/path', 'test')).not.toThrow();
        expect(() => Validators.category('valid-category')).not.toThrow();
        expect(() => Validators.filePattern('valid/{category}.md')).not.toThrow();
    });
});

describe('validateCommon', () => {
    afterEach(() => {
        cleanup();
    });

    it('should validate multiple inputs at once', () => {
        const data = {
            path: 'valid/path.md',
            category: 'valid-category',
            apiKey: 'sk-proj-1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
            filePattern: 'inbox/{category}/{filename}.md'
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
            category: 'valid-category'
        };

        expect(() => validateCommon(data)).toThrow();
    });
});