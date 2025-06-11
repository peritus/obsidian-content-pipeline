/**
 * Path Resolver Tests
 * 
 * Comprehensive test suite for the path resolution system.
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
            const pattern = 'inbox/audio/{category}';
            const context: PathContext = { category: 'tasks' };
            
            const result = PathResolver.resolvePath(pattern, context);
            
            expect(result.resolvedPath).toBe('inbox/audio/tasks');
            expect(result.isComplete).toBe(true);
            expect(result.substitutions.category).toBe('tasks');
            expect(result.missingVariables).toHaveLength(0);
        });

        it('should resolve complex patterns with multiple variables', () => {
            const pattern = 'inbox/{stepId}/{category}/{filename}-{date}.md';
            const context: PathContext = {
                stepId: 'transcribe',
                category: 'thoughts',
                filename: 'recording-001',
                date: '2024-01-15'
            };
            
            const result = PathResolver.resolvePath(pattern, context);
            const expected = 'inbox/transcribe/thoughts/recording-001-2024-01-15.md';
            
            expect(result.resolvedPath).toBe(expected);
            expect(result.isComplete).toBe(true);
            expect(result.substitutions).toEqual({
                stepId: 'transcribe',
                category: 'thoughts', 
                filename: 'recording-001',
                date: '2024-01-15'
            });
        });

        it('should generate timestamps automatically', () => {
            const pattern = 'logs/{timestamp}/{category}.log';
            const context: PathContext = { category: 'debug' };
            
            const result = PathResolver.resolvePath(pattern, context);
            
            expect(result.isComplete).toBe(true);
            expect(result.resolvedPath).toMatch(/logs\/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\/debug\.log/);
            expect(result.substitutions.timestamp).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/);
        });

        it('should handle missing variables gracefully', () => {
            const pattern = 'inbox/{category}/{filename}.md';
            const context: PathContext = { category: 'tasks' }; // missing filename
            
            const result = PathResolver.resolvePath(pattern, context);
            
            expect(result.isComplete).toBe(false);
            expect(result.missingVariables).toContain('filename');
            expect(result.resolvedPath).toContain('inbox/tasks/');
            expect(result.substitutions.category).toBe('tasks');
        });

        it('should throw on missing variables when throwOnMissing is true', () => {
            const pattern = 'inbox/{category}';
            const context: PathContext = {}; // missing category
            
            expect(() => {
                PathResolver.resolvePath(pattern, context, { throwOnMissing: true });
            }).toThrow('missing required variable');
        });

        it('should use fallback values for missing variables', () => {
            const pattern = 'inbox/{category}/{filename}.md';
            const context: PathContext = { category: 'tasks' };
            const fallbacks = { filename: 'default' };
            
            const result = PathResolver.resolvePath(pattern, context, { fallbacks });
            
            expect(result.resolvedPath).toBe('inbox/tasks/default.md');
            expect(result.isComplete).toBe(true);
            expect(result.substitutions.filename).toBe('default');
        });

        it('should validate resolved paths by default', () => {
            const pattern = 'inbox/{category}';
            const context: PathContext = { category: '../../../etc' }; // path traversal attempt
            
            expect(() => {
                PathResolver.resolvePath(pattern, context);
            }).toThrow('invalid resolved path');
        });

        it('should skip validation when validateResult is false', () => {
            const pattern = 'inbox/{category}';
            const context: PathContext = { category: '../test' };
            
            const result = PathResolver.resolvePath(pattern, context, { validateResult: false });
            
            expect(result.resolvedPath).toBe('inbox/../test');
            expect(result.isComplete).toBe(true);
        });

        it('should throw on unsupported variables', () => {
            const pattern = 'inbox/{invalidVariable}';
            const context: PathContext = {};
            
            expect(() => {
                PathResolver.resolvePath(pattern, context);
            }).toThrow('unsupported variable');
        });
    });

    describe('extractVariables', () => {
        it('should extract variables from patterns', () => {
            const pattern = 'inbox/{category}/{filename}-{date}.md';
            const variables = PathResolver.extractVariables(pattern);
            
            expect(variables).toEqual(['category', 'filename', 'date']);
        });

        it('should handle patterns with no variables', () => {
            const pattern = 'inbox/static/path.md';
            const variables = PathResolver.extractVariables(pattern);
            
            expect(variables).toEqual([]);
        });

        it('should handle duplicate variables', () => {
            const pattern = 'inbox/{category}/{category}/file.md';
            const variables = PathResolver.extractVariables(pattern);
            
            expect(variables).toEqual(['category', 'category']);
        });
    });

    describe('containsVariables', () => {
        it('should detect if pattern contains specific variables', () => {
            const pattern = 'inbox/{category}/{filename}.md';
            
            expect(PathResolver.containsVariables(pattern, ['category'])).toBe(true);
            expect(PathResolver.containsVariables(pattern, ['category', 'filename'])).toBe(true);
            expect(PathResolver.containsVariables(pattern, ['category', 'missing'])).toBe(false);
            expect(PathResolver.containsVariables(pattern, [])).toBe(true);
        });
    });

    describe('isValidPattern', () => {
        it('should validate patterns with supported variables', () => {
            expect(PathResolver.isValidPattern('inbox/{category}')).toBe(true);
            expect(PathResolver.isValidPattern('inbox/{category}/{filename}.md')).toBe(true);
            expect(PathResolver.isValidPattern('static/path.md')).toBe(true);
        });

        it('should reject patterns with unsupported variables', () => {
            expect(PathResolver.isValidPattern('inbox/{invalidVar}')).toBe(false);
            expect(PathResolver.isValidPattern('inbox/{category}/{invalid}.md')).toBe(false);
        });
    });

    describe('getRequiredVariables', () => {
        it('should return required variables for pattern', () => {
            const pattern = 'inbox/{category}/{filename}-{date}.md';
            const required = PathResolver.getRequiredVariables(pattern);
            
            expect(required).toEqual(['category', 'filename', 'date']);
        });

        it('should filter out unsupported variables', () => {
            const pattern = 'inbox/{category}/{invalid}/{filename}.md';
            const required = PathResolver.getRequiredVariables(pattern);
            
            expect(required).toEqual(['category', 'filename']);
        });
    });

    describe('createDefaultContext', () => {
        it('should create context with default values', () => {
            const context = PathResolver.createDefaultContext();
            
            expect(context.category).toBe('uncategorized');
            expect(context.timestamp).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/);
            expect(context.date).toMatch(/\d{4}-\d{2}-\d{2}/);
        });

        it('should merge overrides with defaults', () => {
            const context = PathResolver.createDefaultContext({ 
                category: 'custom',
                filename: 'test' 
            });
            
            expect(context.category).toBe('custom');
            expect(context.filename).toBe('test');
            expect(context.timestamp).toBeDefined();
        });
    });

    describe('resolveMultiple', () => {
        it('should resolve multiple patterns', () => {
            const patterns = [
                'inbox/{category}',
                'output/{category}/{filename}.md'
            ];
            const context: PathContext = { category: 'tasks', filename: 'test' };
            
            const results = PathResolver.resolveMultiple(patterns, context);
            
            expect(results).toHaveLength(2);
            expect(results[0].resolvedPath).toBe('inbox/tasks');
            expect(results[1].resolvedPath).toBe('output/tasks/test.md');
            expect(results.every(r => r.isComplete)).toBe(true);
        });
    });

    describe('Real-world pipeline patterns', () => {
        const context = createMockContext({
            category: 'work-meetings',
            filename: 'standup-2024-01-15',
            stepId: 'transcribe'
        });

        it('should resolve transcribe patterns', () => {
            const pattern = 'inbox/transcripts/{category}/{filename}-transcript.md';
            const result = PathResolver.resolvePath(pattern, context);
            
            expect(result.resolvedPath).toBe('inbox/transcripts/work-meetings/standup-2024-01-15-transcript.md');
            expect(result.isComplete).toBe(true);
        });

        it('should resolve process patterns', () => {
            const pattern = 'inbox/results/{category}/{filename}-processed.md';
            const result = PathResolver.resolvePath(pattern, context);
            
            expect(result.resolvedPath).toBe('inbox/results/work-meetings/standup-2024-01-15-processed.md');
            expect(result.isComplete).toBe(true);
        });

        it('should resolve archive patterns', () => {
            const pattern = 'inbox/archive/{stepId}/{category}';
            const result = PathResolver.resolvePath(pattern, context);
            
            expect(result.resolvedPath).toBe('inbox/archive/transcribe/work-meetings');
            expect(result.isComplete).toBe(true);
        });

        it('should handle all default pipeline patterns', () => {
            const patterns = [
                'inbox/audio/{category}',
                'inbox/transcripts/{category}/{filename}-transcript.md',
                'inbox/results/{category}/{filename}-processed.md',
                'inbox/summary/{category}/',
                'inbox/archive/{stepId}/{category}',
                'inbox/templates/{stepId}.md'
            ];

            patterns.forEach(pattern => {
                const result = PathResolver.resolvePath(pattern, context);
                expect(result.isComplete).toBe(true);
                expect(result.resolvedPath).toBeValidPath();
            });
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

    describe('extractCategory', () => {
        it('should extract category from categorized paths', () => {
            const pattern = 'inbox/audio/{category}';
            const path = 'inbox/audio/personal-notes';
            
            expect(PathUtils.extractCategory(path, pattern)).toBe('personal-notes');
        });

        it('should return null for non-matching patterns', () => {
            const pattern = 'inbox/audio/{category}';
            const path = 'other/path/structure';
            
            expect(PathUtils.extractCategory(path, pattern)).toBeNull();
        });

        it('should handle complex category patterns', () => {
            const pattern = 'inbox/{stepId}/{category}/files';
            const path = 'inbox/transcribe/work-meetings/files';
            
            expect(PathUtils.extractCategory(path, pattern)).toBe('work-meetings');
        });
    });

    describe('utility functions', () => {
        const context = createMockContext();

        it('should safely resolve paths', () => {
            const goodPattern = 'inbox/{category}';
            const badPattern = 'inbox/{invalidVar}';
            
            expect(PathUtils.safeResolve(goodPattern, context)).toBe('inbox/test-category');
            expect(PathUtils.safeResolve(badPattern, context)).toBeNull();
        });

        it('should check if patterns can be resolved', () => {
            const pattern = 'inbox/{category}/{filename}.md';
            const fullContext = { category: 'test', filename: 'file' };
            const partialContext = { category: 'test' };
            
            expect(PathUtils.canResolve(pattern, fullContext)).toBe(true);
            expect(PathUtils.canResolve(pattern, partialContext)).toBe(false);
        });

        it('should identify missing variables', () => {
            const pattern = 'inbox/{category}/{filename}.md';
            const partialContext = { category: 'test' };
            
            const missing = PathUtils.getMissingVariables(pattern, partialContext);
            expect(missing).toEqual(['filename']);
        });
    });
});

describe('SUPPORTED_PATH_VARIABLES', () => {
    it('should contain expected variables', () => {
        const expected = ['category', 'filename', 'timestamp', 'date', 'stepId'];
        expect([...SUPPORTED_PATH_VARIABLES]).toEqual(expected);
    });

    it('should be readonly', () => {
        expect(() => {
            // @ts-expect-error - testing that the array is readonly
            SUPPORTED_PATH_VARIABLES.push('invalid');
        }).toThrow();
    });
});