/**
 * Validation System Tests - Simplified for debugging
 */

import * as v from 'valibot';
import { 
    apiKeySchema,
    pathSchema,
    filePatternSchema,
    pipelineStepSchema,
    pipelineConfigSchema,
    validateConfig,
    isValidConfig,
    getConfigErrors
} from '../src/validation';
import { createMockPipelineStep, createMockPipelineConfig, cleanup } from './setup';

describe('Basic Validation Tests', () => {
    afterEach(() => {
        cleanup();
    });

    describe('validatePath', () => {
        it('should accept valid vault-relative paths', () => {
            expect(() => v.parse(pathSchema, 'inbox/audio')).not.toThrow();
            expect(() => v.parse(pathSchema, 'valid/path/file.md')).not.toThrow();
            expect(() => v.parse(pathSchema, 'simple.md')).not.toThrow();
        });

        it('should reject empty paths', () => {
            expect(() => v.parse(pathSchema, '')).toThrow('Path cannot be empty');
            expect(() => v.parse(pathSchema, '   ')).toThrow('Path cannot be empty');
        });
    });

    describe('validateApiKey', () => {
        it('should accept valid OpenAI project API keys', () => {
            expect(() => v.parse(apiKeySchema, 'sk-proj-1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef')).not.toThrow();
        });

        it('should reject empty API keys', () => {
            expect(() => v.parse(apiKeySchema, '')).toThrow('API key cannot be empty');
        });
    });

    describe('validatePipelineStep', () => {
        it('should accept valid pipeline steps', () => {
            const step = createMockPipelineStep();
            expect(() => v.parse(pipelineStepSchema, step)).not.toThrow();
        });
    });
});
