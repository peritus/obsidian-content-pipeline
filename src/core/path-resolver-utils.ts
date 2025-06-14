/**
 * Test utilities for PathResolver functionality
 * 
 * This file contains test utilities and examples for the path resolution system.
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
        const pattern = 'inbox/audio/{stepId}';
        const context: PathContext = { stepId: 'transcribe' };
        
        const result = PathResolver.resolvePath(pattern, context);
        
        if (result.resolvedPath !== 'inbox/audio/transcribe') {
            throw new Error(`Expected 'inbox/audio/transcribe', got '${result.resolvedPath}'`);
        }
        
        if (!result.isComplete) {
            throw new Error('Expected complete resolution');
        }
        
        if (result.substitutions.stepId !== 'transcribe') {
            throw new Error('Expected stepId substitution');
        }
    }

    /**
     * Test all variable types
     */
    static testVariableSubstitution(): void {
        const pattern = 'inbox/{stepId}/{filename}-{date}.md';
        const context: PathContext = {
            stepId: 'process-thoughts',
            filename: 'recording-001',
            date: '2024-01-15'
        };
        
        const result = PathResolver.resolvePath(pattern, context);
        const expected = 'inbox/process-thoughts/recording-001-2024-01-15.md';
        
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
        const pattern = 'inbox/{stepId}/{filename}.md';
        const context: PathContext = { stepId: 'transcribe' }; // missing filename
        
        const result = PathResolver.resolvePath(pattern, context);
        
        if (result.isComplete) {
            throw new Error('Expected incomplete resolution');
        }
        
        if (!result.missingVariables.includes('filename')) {
            throw new Error('Expected filename in missing variables');
        }
        
        // Should still substitute available variables
        if (!result.resolvedPath.includes('inbox/transcribe/')) {
            throw new Error('Should substitute available variables');
        }
    }

    /**
     * Test path utility functions
     */
    static testPathUtilities(): void {
        // Test normalization
        const normalized = PathUtils.normalize('//inbox\\audio//transcripts\\');
        if (normalized !== 'inbox/audio/transcripts') {
            throw new Error(`Normalization failed: ${normalized}`);
        }
        
        // Test joining
        const joined = PathUtils.join('inbox', 'audio', 'recordings');
        if (joined !== 'inbox/audio/recordings') {
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
                'inbox/{stepId}', 
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
        const transcribePattern = 'inbox/transcripts/{filename}-transcript.md';
        const processPattern = 'inbox/process-thoughts/{filename}-processed.md';
        const archivePattern = 'inbox/archive/{stepId}';
        
        const context: PathContext = {
            filename: 'standup-2024-01-15',
            stepId: 'transcribe'
        };
        
        // Test transcribe output
        const transcribeResult = PathResolver.resolvePath(transcribePattern, context);
        const expectedTranscribe = 'inbox/transcripts/standup-2024-01-15-transcript.md';
        if (transcribeResult.resolvedPath !== expectedTranscribe) {
            throw new Error(`Transcribe pattern failed: ${transcribeResult.resolvedPath}`);
        }
        
        // Test process output
        const processResult = PathResolver.resolvePath(processPattern, context);
        const expectedProcess = 'inbox/process-thoughts/standup-2024-01-15-processed.md';
        if (processResult.resolvedPath !== expectedProcess) {
            throw new Error(`Process pattern failed: ${processResult.resolvedPath}`);
        }
        
        // Test archive
        const archiveResult = PathResolver.resolvePath(archivePattern, context);
        const expectedArchive = 'inbox/archive/transcribe';
        if (archiveResult.resolvedPath !== expectedArchive) {
            throw new Error(`Archive pattern failed: ${archiveResult.resolvedPath}`);
        }
        
        // Test timestamp generation
        const timestampPattern = 'logs/{timestamp}/{stepId}.log';
        const timestampResult = PathResolver.resolvePath(timestampPattern, { stepId: 'debug' });
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
                'inbox/audio/{stepId}', 
                { stepId: 'test' }
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
            'inbox/audio',
            'inbox/transcripts/{filename}-transcript.md',
            'inbox/process-thoughts/{filename}-processed.md', 
            'inbox/summary-personal/',
            'inbox/archive/{stepId}',
        ];

        const context: PathContext = {
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
    const expectedVariables = ['filename', 'timestamp', 'date', 'stepId'];
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