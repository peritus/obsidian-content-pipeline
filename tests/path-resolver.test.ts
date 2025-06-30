/**
 * Path Resolver Tests
 * 
 * Comprehensive test suite for the path resolution system.
 * Removed category-related functionality and updated for step-based organization.
 */

import { PathResolver, PathUtils, SUPPORTED_PATH_VARIABLES } from '../src/core/path-resolver';
import { PathContext } from '../src/types';
import { createMockContext, cleanup } from './setup';

describe('PathResolver', () => {
    afterEach(() => {
        cleanup();
    });

    describe('resolvePath', () => {
        it('should resolve basic path patterns', () => {
            const pattern = 'inbox/audio';
            const context: PathContext = {};
            
            const result = PathResolver.resolvePath(pattern, context);
            
            expect(result.resolvedPath).toBe('inbox/audio');
            expect(result.isComplete).toBe(true);
            expect(result.missingVariables).toHaveLength(0);
        });

        it('should resolve patterns with filename variables', () => {
            const pattern = 'inbox/transcripts/{filename}-transcript.md';
            const context: PathContext = {
                filename: 'recording-001'
            };
            
            const result = PathResolver.resolvePath(pattern, context);
            
            expect(result.resolvedPath).toBe('inbox/transcripts/recording-001-transcript.md');
            expect(result.isComplete).toBe(true);
            expect(result.substitutions.filename).toBe('recording-001');
        });

        it('should resolve complex patterns with multiple variables', () => {
            const pattern = 'inbox/{stepId}/{filename}-{date}.md';
            const context: PathContext = {
                stepId: 'transcribe',
                filename: 'recording-001',
                date: '2024-01-15'
            };
            
            const result = PathResolver.resolvePath(pattern, context);
            const expected = 'inbox/transcribe/recording-001-2024-01-15.md';
            
            expect(result.resolvedPath).toBe(expected);
            expect(result.isComplete).toBe(true);
            expect(result.substitutions).toEqual({
                stepId: 'transcribe',
                filename: 'recording-001',
                date: '2024-01-15'
            });
        });

        it('should generate timestamps automatically', () => {
            const pattern = 'logs/{timestamp}/debug.log';
            const context: PathContext = {};
            
            const result = PathResolver.resolvePath(pattern, context);
            
            expect(result.isComplete).toBe(true);
            expect(result.resolvedPath).toMatch(/logs\/\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z\/debug\.log/);
            expect(result.substitutions.timestamp).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z/);
        });

        it('should generate dates automatically', () => {
            const pattern = 'inbox/archive/{date}/{filename}.md';
            const context: PathContext = { filename: 'test' };
            
            const result = PathResolver.resolvePath(pattern, context);
            
            expect(result.isComplete).toBe(true);
            expect(result.resolvedPath).toMatch(/inbox\/archive\/\d{4}-\d{2}-\d{2}\/test\.md/);
            expect(result.substitutions.date).toMatch(/\d{4}-\d{2}-\d{2}/);
        });

        it('should handle missing variables gracefully', () => {
            const pattern = 'inbox/{stepId}/{filename}.md';
            const context: PathContext = { stepId: 'transcribe' }; // missing filename
            
            const result = PathResolver.resolvePath(pattern, context);
            
            expect(result.isComplete).toBe(false);
            expect(result.missingVariables).toContain('filename');
            expect(result.resolvedPath).toContain('inbox/transcribe/');
            expect(result.substitutions.stepId).toBe('transcribe');
        });

        it('should throw on missing variables when throwOnMissing is true', () => {
            const pattern = 'inbox/{stepId}';
            const context: PathContext = {}; // missing stepId
            
            expect(() => {
                PathResolver.resolvePath(pattern, context, { throwOnMissing: true });
            }).toThrow('Missing required variable for path resolution: {stepId}');
        });

        it('should use fallback values for missing variables', () => {
            const pattern = 'inbox/{stepId}/{filename}.md';
            const context: PathContext = { stepId: 'transcribe' };
            const fallbacks = { filename: 'default' };
            
            const result = PathResolver.resolvePath(pattern, context, { fallbacks });
            
            expect(result.resolvedPath).toBe('inbox/transcribe/default.md');
            expect(result.isComplete).toBe(true);
            expect(result.substitutions.filename).toBe('default');
        });

        it('should validate resolved paths by default', () => {
            const pattern = 'inbox/{stepId}';
            const context: PathContext = { stepId: '../../../etc' }; // path traversal attempt
            
            expect(() => {
                PathResolver.resolvePath(pattern, context);
            }).toThrow('Path traversal detected in resolved path: inbox/../../../etc - path traversal not allowed');
        });

        it('should skip validation when validateResult is false', () => {
            const pattern = 'inbox/{stepId}';
            const context: PathContext = { stepId: '../test' };
            
            const result = PathResolver.resolvePath(pattern, context, { validateResult: false });
            
            expect(result.resolvedPath).toBe('inbox/../test');
            expect(result.isComplete).toBe(true);
        });

        it('should throw on unsupported variables', () => {
            const pattern = 'inbox/{invalidVariable}';
            const context: PathContext = {};
            
            expect(() => {
                PathResolver.resolvePath(pattern, context);
            }).toThrow('Unsupported variable in path pattern: {invalidVariable}');
        });
    });

    describe('extractVariables', () => {
        it('should extract variables from patterns', () => {
            const pattern = 'inbox/{stepId}/{filename}-{date}.md';
            const variables = PathResolver.extractVariables(pattern);
            
            expect(variables).toEqual(['stepId', 'filename', 'date']);
        });

        it('should handle patterns with no variables', () => {
            const pattern = 'inbox/static/path.md';
            const variables = PathResolver.extractVariables(pattern);
            
            expect(variables).toEqual([]);
        });

        it('should handle duplicate variables', () => {
            const pattern = 'inbox/{stepId}/{stepId}/file.md';
            const variables = PathResolver.extractVariables(pattern);
            
            expect(variables).toEqual(['stepId', 'stepId']);
        });
    });

    describe('containsVariables', () => {
        it('should detect if pattern contains specific variables', () => {
            const pattern = 'inbox/{stepId}/{filename}.md';
            
            expect(PathResolver.containsVariables(pattern, ['stepId'])).toBe(true);
            expect(PathResolver.containsVariables(pattern, ['stepId', 'filename'])).toBe(true);
            expect(PathResolver.containsVariables(pattern, ['stepId', 'missing'])).toBe(false);
            expect(PathResolver.containsVariables(pattern, [])).toBe(true);
        });
    });

    describe('isValidPattern', () => {
        it('should validate patterns with supported variables', () => {
            expect(PathResolver.isValidPattern('inbox/{stepId}')).toBe(true);
            expect(PathResolver.isValidPattern('inbox/{stepId}/{filename}.md')).toBe(true);
            expect(PathResolver.isValidPattern('static/path.md')).toBe(true);
            expect(PathResolver.isValidPattern('inbox/{timestamp}/{date}')).toBe(true);
        });

        it('should reject patterns with unsupported variables', () => {
            expect(PathResolver.isValidPattern('inbox/{invalidVar}')).toBe(false);
            expect(PathResolver.isValidPattern('inbox/{stepId}/{invalid}.md')).toBe(false);
            expect(PathResolver.isValidPattern('inbox/{category}')).toBe(false); // category no longer supported
        });
    });

    describe('getRequiredVariables', () => {
        it('should return required variables for pattern', () => {
            const pattern = 'inbox/{stepId}/{filename}-{date}.md';
            const required = PathResolver.getRequiredVariables(pattern);
            
            expect(required).toEqual(['stepId', 'filename', 'date']);
        });

        it('should filter out unsupported variables', () => {
            const pattern = 'inbox/{stepId}/{invalid}/{filename}.md';
            const required = PathResolver.getRequiredVariables(pattern);
            
            expect(required).toEqual(['stepId', 'filename']);
        });
    });

    describe('createDefaultContext', () => {
        it('should create context with default values', () => {
            const context = PathResolver.createDefaultContext();
            
            expect(context.timestamp).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z/);
            expect(context.date).toMatch(/\d{4}-\d{2}-\d{2}/);
            expect(context.stepId).toBeUndefined(); // No default stepId
            expect(context.filename).toBeUndefined(); // No default filename
        });

        it('should merge overrides with defaults', () => {
            const context = PathResolver.createDefaultContext({ 
                stepId: 'custom',
                filename: 'test' 
            });
            
            expect(context.stepId).toBe('custom');
            expect(context.filename).toBe('test');
            expect(context.timestamp).toBeDefined();
            expect(context.date).toBeDefined();
        });
    });

    describe('resolveMultiple', () => {
        it('should resolve multiple patterns', () => {
            const patterns = [
                'inbox/{stepId}',
                'output/{stepId}/{filename}.md'
            ];
            const context: PathContext = { stepId: 'transcribe', filename: 'test' };
            
            const results = PathResolver.resolveMultiple(patterns, context);
            
            expect(results).toHaveLength(2);
            expect(results[0].resolvedPath).toBe('inbox/transcribe');
            expect(results[1].resolvedPath).toBe('output/transcribe/test.md');
            expect(results.every((r: any) => r.isComplete)).toBe(true);
        });
    });

    describe('Real-world pipeline patterns', () => {
        const context = createMockContext({
            filename: 'standup-2024-01-15',
            stepId: 'transcribe'
        });

        it('should resolve transcribe input patterns', () => {
            const pattern = 'inbox/audio';
            const result = PathResolver.resolvePath(pattern, context);
            
            expect(result.resolvedPath).toBe('inbox/audio');
            expect(result.isComplete).toBe(true);
        });

        it('should resolve transcribe output patterns', () => {
            const pattern = 'inbox/transcripts/{filename}-transcript.md';
            const result = PathResolver.resolvePath(pattern, context);
            
            expect(result.resolvedPath).toBe('inbox/transcripts/standup-2024-01-15-transcript.md');
            expect(result.isComplete).toBe(true);
        });

        it('should resolve process step patterns', () => {
            const pattern = 'inbox/process-thoughts/{filename}-processed.md';
            const result = PathResolver.resolvePath(pattern, context);
            
            expect(result.resolvedPath).toBe('inbox/process-thoughts/standup-2024-01-15-processed.md');
            expect(result.isComplete).toBe(true);
        });

        it('should resolve archive patterns', () => {
            const pattern = 'inbox/archive/{stepId}';
            const result = PathResolver.resolvePath(pattern, context);
            
            expect(result.resolvedPath).toBe('inbox/archive/transcribe');
            expect(result.isComplete).toBe(true);
        });

        it('should resolve summary directory patterns', () => {
            const pattern = 'inbox/summary-personal/';
            const result = PathResolver.resolvePath(pattern, context);
            
            expect(result.resolvedPath).toBe('inbox/summary-personal/');
            expect(result.isComplete).toBe(true);
        });

        it('should handle all default pipeline patterns', () => {
            const patterns = [
                'inbox/audio',
                'inbox/transcripts/{filename}-transcript.md',
                'inbox/process-thoughts/{filename}-processed.md',
                'inbox/process-tasks/{filename}-processed.md',
                'inbox/process-ideas/{filename}-processed.md',
                'inbox/summary-personal/',
                'inbox/summary-work/',
                'inbox/archive/{stepId}'
            ];

            patterns.forEach(pattern => {
                const result = PathResolver.resolvePath(pattern, context);
                expect(result.resolvedPath).toBeValidPath();
                // Some patterns may not be complete if they have missing variables
                if (result.missingVariables.length === 0) {
                    expect(result.isComplete).toBe(true);
                }
            });
        });
    });

    describe('Directory-only output patterns', () => {
        it('should handle directory-only patterns for multi-file outputs', () => {
            const pattern = 'inbox/summary-personal/';
            const context: PathContext = {};
            
            const result = PathResolver.resolvePath(pattern, context);
            
            expect(result.resolvedPath).toBe('inbox/summary-personal/');
            expect(result.isComplete).toBe(true);
        });

        it('should handle include glob patterns', () => {
            const pattern = 'inbox/summary-personal/*';
            const context: PathContext = {};
            
            const result = PathResolver.resolvePath(pattern, context);
            
            expect(result.resolvedPath).toBe('inbox/summary-personal/*');
            expect(result.isComplete).toBe(true);
        });
    });
});

describe('PathUtils', () => {
    afterEach(() => {
        cleanup();
    });

    describe('normalize', () => {
        it('should normalize paths correctly', () => {
            expect(PathUtils.normalize('//inbox\\audio//tasks\\')).toBe('inbox/audio/tasks');
            expect(PathUtils.normalize('/inbox/audio/tasks')).toBe('inbox/audio/tasks');
            expect(PathUtils.normalize('inbox\\audio\\tasks')).toBe('inbox/audio/tasks');
            expect(PathUtils.normalize('inbox/audio/tasks/')).toBe('inbox/audio/tasks');
        });

        it('should handle empty and edge cases', () => {
            expect(PathUtils.normalize('')).toBe('');
            expect(PathUtils.normalize('/')).toBe('');
            expect(PathUtils.normalize('///')).toBe('');
            expect(PathUtils.normalize('single')).toBe('single');
        });
    });

    describe('join', () => {
        it('should join path segments correctly', () => {
            expect(PathUtils.join('inbox', 'audio', 'tasks')).toBe('inbox/audio/tasks');
            expect(PathUtils.join('/inbox/', '/audio/', '/tasks/')).toBe('inbox/audio/tasks');
            expect(PathUtils.join('inbox', '', 'audio', 'tasks')).toBe('inbox/audio/tasks');
        });

        it('should handle empty segments', () => {
            expect(PathUtils.join()).toBe('');
            expect(PathUtils.join('', '', '')).toBe('');
            expect(PathUtils.join('inbox', '', 'tasks')).toBe('inbox/tasks');
        });
    });

    describe('getDirectory', () => {
        it('should extract directory from path', () => {
            expect(PathUtils.getDirectory('inbox/audio/file.mp3')).toBe('inbox/audio');
            expect(PathUtils.getDirectory('file.mp3')).toBe('');
            expect(PathUtils.getDirectory('inbox/audio/')).toBe('inbox');
        });
    });

    describe('getFilename', () => {
        it('should extract filename from path', () => {
            expect(PathUtils.getFilename('inbox/audio/file.mp3')).toBe('file.mp3');
            expect(PathUtils.getFilename('file.mp3')).toBe('file.mp3');
            expect(PathUtils.getFilename('inbox/audio/')).toBe('');
        });
    });

    describe('getBasename', () => {
        it('should extract basename from path', () => {
            expect(PathUtils.getBasename('inbox/audio/file.mp3')).toBe('file');
            expect(PathUtils.getBasename('file.mp3')).toBe('file');
            expect(PathUtils.getBasename('file')).toBe('file');
            expect(PathUtils.getBasename('file.tar.gz')).toBe('file.tar');
        });
    });

    describe('getExtension', () => {
        it('should extract extension from path', () => {
            expect(PathUtils.getExtension('inbox/audio/file.mp3')).toBe('.mp3');
            expect(PathUtils.getExtension('file.mp3')).toBe('.mp3');
            expect(PathUtils.getExtension('file')).toBe('');
            expect(PathUtils.getExtension('file.tar.gz')).toBe('.gz');
        });
    });

    describe('isDirectory', () => {
        it('should detect directory paths', () => {
            expect(PathUtils.isDirectory('inbox/audio/')).toBe(true);
            expect(PathUtils.isDirectory('inbox/audio')).toBe(true); // no extension
            expect(PathUtils.isDirectory('inbox/audio/file.mp3')).toBe(false);
            expect(PathUtils.isDirectory('file.mp3')).toBe(false);
        });
    });

    describe('ensureDirectory', () => {
        it('should ensure path ends with slash', () => {
            expect(PathUtils.ensureDirectory('inbox/audio')).toBe('inbox/audio/');
            expect(PathUtils.ensureDirectory('inbox/audio/')).toBe('inbox/audio/');
            expect(PathUtils.ensureDirectory('')).toBe('/');
        });
    });

    describe('utility functions', () => {
        const context = createMockContext();

        it('should safely resolve paths', () => {
            const goodPattern = 'inbox/{stepId}';
            const badPattern = 'inbox/{invalidVar}';
            
            expect(PathUtils.safeResolve(goodPattern, context)).toBe('inbox/test-step');
            expect(PathUtils.safeResolve(badPattern, context)).toBeNull();
        });

        it('should check if patterns can be resolved', () => {
            const pattern = 'inbox/{stepId}/{filename}.md';
            const fullContext = { stepId: 'test', filename: 'file' };
            const partialContext = { stepId: 'test' };
            
            expect(PathUtils.canResolve(pattern, fullContext)).toBe(true);
            expect(PathUtils.canResolve(pattern, partialContext)).toBe(false);
        });

        it('should identify missing variables', () => {
            const pattern = 'inbox/{stepId}/{filename}.md';
            const partialContext = { stepId: 'test' };
            
            const missing = PathUtils.getMissingVariables(pattern, partialContext);
            expect(missing).toEqual(['filename']);
        });

        it('should handle step-based path patterns', () => {
            const stepPattern = 'inbox/archive/{stepId}/{filename}.md';
            const stepContext = { stepId: 'transcribe', filename: 'audio-001' };
            
            const result = PathUtils.safeResolve(stepPattern, stepContext);
            expect(result).toBe('inbox/archive/transcribe/audio-001.md');
        });
    });

    describe('Variable substitution patterns', () => {
        it('should handle filename variable substitution', () => {
            const context = { filename: 'meeting-notes' };
            const pattern = 'output/{filename}-processed.md';
            
            const result = PathUtils.safeResolve(pattern, context);
            expect(result).toBe('output/meeting-notes-processed.md');
        });

        it('should handle stepId variable substitution', () => {
            const context = { stepId: 'process-thoughts' };
            const pattern = 'inbox/archive/{stepId}/';
            
            const result = PathUtils.safeResolve(pattern, context);
            expect(result).toBe('inbox/archive/process-thoughts/');
        });

        it('should handle timestamp variable substitution', () => {
            const context = { timestamp: '2024-01-15T10-30-00-000Z' };
            const pattern = 'logs/{timestamp}/debug.log';
            
            const result = PathUtils.safeResolve(pattern, context);
            expect(result).toBe('logs/2024-01-15T10-30-00-000Z/debug.log');
        });

        it('should handle date variable substitution', () => {
            const context = { date: '2024-01-15' };
            const pattern = 'daily/{date}/summary.md';
            
            const result = PathUtils.safeResolve(pattern, context);
            expect(result).toBe('daily/2024-01-15/summary.md');
        });

        it('should handle complex multi-variable patterns', () => {
            const context = { 
                stepId: 'summary-personal',
                filename: 'thoughts-collection',
                date: '2024-01-15'
            };
            const pattern = 'output/{stepId}/{date}/{filename}.md';
            
            const result = PathUtils.safeResolve(pattern, context);
            expect(result).toBe('output/summary-personal/2024-01-15/thoughts-collection.md');
        });
    });
});

describe('SUPPORTED_PATH_VARIABLES', () => {
    it('should contain expected variables', () => {
        const expected = ['filename', 'timestamp', 'date', 'stepId'];
        expect([...SUPPORTED_PATH_VARIABLES]).toEqual(expected);
    });

    it('should not contain removed variables from v1.0', () => {
        expect(SUPPORTED_PATH_VARIABLES).not.toContain('category');
        expect(SUPPORTED_PATH_VARIABLES).not.toContain('originalCategory');
        expect(SUPPORTED_PATH_VARIABLES).not.toContain('resolvedCategory');
    });

    it('should be readonly', () => {
        // The array should be frozen to prevent modification
        expect(Object.isFrozen(SUPPORTED_PATH_VARIABLES)).toBe(true);
        
        // Attempting to push should fail silently (or throw in strict mode)
        const originalLength = SUPPORTED_PATH_VARIABLES.length;
        try {
            (SUPPORTED_PATH_VARIABLES as any).push('invalid');
        } catch (error) {
            // This might throw in strict mode, which is fine
        }
        expect(SUPPORTED_PATH_VARIABLES.length).toBe(originalLength);
    });

    it('should support all variables used in default configuration', () => {
        const variables = ['filename', 'stepId', 'timestamp', 'date'];
        
        variables.forEach(variable => {
            expect(SUPPORTED_PATH_VARIABLES).toContain(variable);
        });
    });
});