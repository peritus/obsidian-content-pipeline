/**
 * Test file for PathResolver functionality
 * 
 * This file contains tests and examples for the path resolution system.
 * It can be imported and run from the main plugin for testing purposes.
 */

import { PathResolver, PathUtils, SUPPORTED_PATH_VARIABLES } from './path-resolver';
import { PathContext } from '../types';
import { createLogger } from '../logger';

const logger = createLogger('PathResolverTest');

/**
 * Test suite for PathResolver
 */
export class PathResolverTests {
    /**
     * Run all tests
     */
    static async runAllTests(): Promise<boolean> {
        logger.info('Starting PathResolver tests...');
        
        const tests = [
            this.testBasicResolution,
            this.testVariableSubstitution,
            this.testMissingVariables,
            this.testPathUtilities,
            this.testCategoryExtraction,
            this.testErrorHandling,
            this.testRealWorldScenarios
        ];

        let passed = 0;
        let failed = 0;

        for (const test of tests) {
            try {
                await test.call(this);
                passed++;
                logger.info(`✅ ${test.name} passed`);
            } catch (error) {
                failed++;
                logger.error(`❌ ${test.name} failed:`, error);
            }
        }

        const total = passed + failed;
        logger.info(`Test results: ${passed}/${total} passed, ${failed} failed`);
        
        return failed === 0;
    }

    /**
     * Test basic path resolution
     */
    static testBasicResolution(): void {
        const pattern = 'inbox/audio/{category}';
        const context: PathContext = { category: 'tasks' };
        
        const result = PathResolver.resolvePath(pattern, context);
        
        if (result.resolvedPath !== 'inbox/audio/tasks') {
            throw new Error(`Expected 'inbox/audio/tasks', got '${result.resolvedPath}'`);
        }
        
        if (!result.isComplete) {
            throw new Error('Expected complete resolution');
        }
        
        if (result.substitutions.category !== 'tasks') {
            throw new Error('Expected category substitution');
        }
    }

    /**
     * Test all variable types
     */
    static testVariableSubstitution(): void {
        const pattern = 'inbox/{stepId}/{category}/{filename}-{date}.md';
        const context: PathContext = {
            stepId: 'transcribe',
            category: 'thoughts',
            filename: 'recording-001',
            date: '2024-01-15'
        };
        
        const result = PathResolver.resolvePath(pattern, context);
        const expected = 'inbox/transcribe/thoughts/recording-001-2024-01-15.md';
        
        if (result.resolvedPath !== expected) {
            throw new Error(`Expected '${expected}', got '${result.resolvedPath}'`);
        }
        
        if (!result.isComplete) {
            throw new Error('Expected complete resolution');
        }
    }

    /**
     * Test handling of missing variables
     */
    static testMissingVariables(): void {
        const pattern = 'inbox/{category}/{filename}.md';
        const context: PathContext = { category: 'tasks' }; // missing filename
        
        const result = PathResolver.resolvePath(pattern, context);
        
        if (result.isComplete) {
            throw new Error('Expected incomplete resolution');
        }
        
        if (!result.missingVariables.includes('filename')) {
            throw new Error('Expected filename in missing variables');
        }
        
        // Should still substitute available variables
        if (!result.resolvedPath.includes('inbox/tasks/')) {
            throw new Error('Should substitute available variables');
        }
    }

    /**
     * Test path utility functions
     */
    static testPathUtilities(): void {
        // Test normalization
        const normalized = PathUtils.normalize('//inbox\\audio//tasks\\');
        if (normalized !== 'inbox/audio/tasks') {
            throw new Error(`Normalization failed: ${normalized}`);
        }
        
        // Test joining
        const joined = PathUtils.join('inbox', 'audio', 'tasks');
        if (joined !== 'inbox/audio/tasks') {
            throw new Error(`Join failed: ${joined}`);
        }
        
        // Test filename extraction
        const filename = PathUtils.getFilename('inbox/audio/recording.mp3');
        if (filename !== 'recording.mp3') {
            throw new Error(`Filename extraction failed: ${filename}`);
        }
        
        // Test basename
        const basename = PathUtils.getBasename('recording.mp3');
        if (basename !== 'recording') {
            throw new Error(`Basename extraction failed: ${basename}`);
        }
        
        // Test extension
        const extension = PathUtils.getExtension('recording.mp3');
        if (extension !== '.mp3') {
            throw new Error(`Extension extraction failed: ${extension}`);
        }
    }

    /**
     * Test category extraction from paths
     */
    static testCategoryExtraction(): void {
        const pattern = 'inbox/audio/{category}';
        const path = 'inbox/audio/personal-notes';
        
        const category = PathUtils.extractCategory(path, pattern);
        if (category !== 'personal-notes') {
            throw new Error(`Category extraction failed: ${category}`);
        }
        
        // Test with no category
        const noCategory = PathUtils.extractCategory('other/path', pattern);
        if (noCategory !== null) {
            throw new Error('Should return null for non-matching pattern');
        }
    }

    /**
     * Test error handling
     */
    static testErrorHandling(): void {
        // Test invalid variable
        try {
            PathResolver.resolvePath('inbox/{invalidVariable}', {});
            throw new Error('Should throw on invalid variable');
        } catch (error) {
            if (!(error as Error).message.includes('unsupported variable')) {
                throw new Error('Wrong error type for invalid variable');
            }
        }
        
        // Test throwOnMissing option
        try {
            PathResolver.resolvePath(
                'inbox/{category}', 
                {}, 
                { throwOnMissing: true }
            );
            throw new Error('Should throw on missing variable');
        } catch (error) {
            if (!(error as Error).message.includes('missing required variable')) {
                throw new Error('Wrong error type for missing variable');
            }
        }
    }

    /**
     * Test real-world scenarios from the requirements
     */
    static testRealWorldScenarios(): void {
        // Test default pipeline patterns
        const transcribePattern = 'inbox/transcripts/{category}/{filename}-transcript.md';
        const processPattern = 'inbox/results/{category}/{filename}-processed.md';
        const archivePattern = 'inbox/archive/{stepId}/{category}';
        
        const context: PathContext = {
            category: 'work-meetings',
            filename: 'standup-2024-01-15',
            stepId: 'transcribe'
        };
        
        // Test transcribe output
        const transcribeResult = PathResolver.resolvePath(transcribePattern, context);
        const expectedTranscribe = 'inbox/transcripts/work-meetings/standup-2024-01-15-transcript.md';
        if (transcribeResult.resolvedPath !== expectedTranscribe) {
            throw new Error(`Transcribe pattern failed: ${transcribeResult.resolvedPath}`);
        }
        
        // Test process output
        const processResult = PathResolver.resolvePath(processPattern, context);
        const expectedProcess = 'inbox/results/work-meetings/standup-2024-01-15-processed.md';
        if (processResult.resolvedPath !== expectedProcess) {
            throw new Error(`Process pattern failed: ${processResult.resolvedPath}`);
        }
        
        // Test archive
        const archiveResult = PathResolver.resolvePath(archivePattern, context);
        const expectedArchive = 'inbox/archive/transcribe/work-meetings';
        if (archiveResult.resolvedPath !== expectedArchive) {
            throw new Error(`Archive pattern failed: ${archiveResult.resolvedPath}`);
        }
        
        // Test timestamp generation
        const timestampPattern = 'logs/{timestamp}/{category}.log';
        const timestampResult = PathResolver.resolvePath(timestampPattern, { category: 'debug' });
        if (!timestampResult.isComplete || !timestampResult.resolvedPath.includes('logs/')) {
            throw new Error('Timestamp generation failed');
        }
    }

    /**
     * Run a quick smoke test for basic functionality
     */
    static smokeTest(): boolean {
        try {
            const result = PathResolver.resolvePath(
                'inbox/audio/{category}', 
                { category: 'test' }
            );
            return result.resolvedPath === 'inbox/audio/test' && result.isComplete;
        } catch (error) {
            logger.error('Smoke test failed:', error);
            return false;
        }
    }

    /**
     * Test specific patterns from the requirements document
     */
    static testRequirementPatterns(): boolean {
        const patterns = [
            'inbox/audio/{category}',
            'inbox/transcripts/{category}/{filename}-transcript.md',
            'inbox/results/{category}/{filename}-processed.md', 
            'inbox/summary/{category}/',
            'inbox/archive/{stepId}/{category}',
            'inbox/templates/{stepId}.md'
        ];

        const context: PathContext = {
            category: 'tasks',
            filename: 'recording-001',
            stepId: 'transcribe',
            timestamp: '2024-01-15T10:30:00Z',
            date: '2024-01-15'
        };

        for (const pattern of patterns) {
            try {
                const result = PathResolver.resolvePath(pattern, context);
                if (!result.isComplete) {
                    logger.error(`Pattern not resolvable: ${pattern}`, result);
                    return false;
                }
                logger.debug(`Pattern resolved: ${pattern} -> ${result.resolvedPath}`);
            } catch (error) {
                logger.error(`Pattern failed: ${pattern}`, error);
                return false;
            }
        }

        return true;
    }
}

/**
 * Quick validation function for the path resolver
 */
export function validatePathResolver(): boolean {
    logger.info('Running PathResolver validation...');
    
    // Check if all supported variables are accounted for
    const expectedVariables = ['category', 'filename', 'timestamp', 'date', 'stepId'];
    const actualVariables = [...SUPPORTED_PATH_VARIABLES];
    
    if (JSON.stringify(expectedVariables.sort()) !== JSON.stringify(actualVariables.sort())) {
        logger.error('Supported variables mismatch', { expectedVariables, actualVariables });
        return false;
    }
    
    // Run smoke test
    if (!PathResolverTests.smokeTest()) {
        logger.error('Smoke test failed');
        return false;
    }
    
    // Test requirement patterns
    if (!PathResolverTests.testRequirementPatterns()) {
        logger.error('Requirements pattern test failed');
        return false;
    }
    
    logger.info('PathResolver validation passed ✅');
    return true;
}

/**
 * Export test utilities
 */
export default PathResolverTests;