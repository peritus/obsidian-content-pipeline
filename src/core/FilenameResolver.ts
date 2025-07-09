/**
 * Unified Filename Resolution System
 *
 * Centralized logic for determining effective filenames for output files.
 * Replaces scattered filename logic across OutputHandler and ChatStepExecutor.
 */

import { createLogger } from '../logger';

const logger = createLogger('FilenameResolver');

/**
 * Generic/default filenames that should trigger fallback to original filename
 */
const GENERIC_FILENAMES = new Set([
    'response',
    'response.md',
    'output',
    'output.md',
    'untitled',
    'untitled.md',
    'result',
    'result.md',
    'document',
    'document.md'
]);

/**
 * Step type to file extension mapping
 */
const STEP_TYPE_EXTENSIONS: Record<string, string> = {
    'whisper': '.md',
    'gpt': '.md',
    'claude': '.md',
    'transcribe': '.md',
    'summarize': '.md',
    'chat': '.md'
};

export class FilenameResolver {
    /**
     * Resolve the effective filename to use for output files
     *
     * Priority order:
     * 1. If LLM provided a meaningful filename (not generic), use it
     * 2. Otherwise, fall back to the original input filename
     *
     * @param llmSuggestion - Filename suggested by LLM (optional)
     * @param originalFilename - Original input filename from context
     * @param stepType - Type of step being executed (for extension mapping)
     * @returns Effective filename to use (without extension)
     */
    static resolveOutputFilename(
        llmSuggestion: string | undefined,
        originalFilename: string
    ): string {
        // Check if LLM provided a meaningful filename
        if (llmSuggestion && this.isValidCustomFilename(llmSuggestion)) {
            const basename = this.getBasename(llmSuggestion);
            logger.debug('Using LLM-provided filename', {
                original: originalFilename,
                llmSuggestion,
                resolved: basename,
                source: 'llm-provided'
            });
            return basename;
        }

        // Fall back to original input filename
        const basename = this.getBasename(originalFilename);
        logger.debug('Using original input filename', {
            original: originalFilename,
            llmSuggestion: llmSuggestion || 'none',
            resolved: basename,
            source: 'original-input'
        });

        return basename;
    }

    /**
     * Check if a filename is a valid custom filename (not generic)
     *
     * @param filename - Filename to check
     * @returns True if filename is meaningful and should be used
     */
    static isValidCustomFilename(filename: string): boolean {
        if (!filename || typeof filename !== 'string') {
            return false;
        }

        // Get the basename without extension for comparison
        const basename = this.getBasename(filename).toLowerCase();

        // Check if it's a generic filename
        const isGeneric = GENERIC_FILENAMES.has(basename) ||
                         GENERIC_FILENAMES.has(filename.toLowerCase());

        return !isGeneric;
    }

    /**
     * Detect if a filename is generic (used for logging/debugging)
     *
     * @param filename - Filename to check
     * @returns True if filename is generic
     */
    static detectGenericFilename(filename: string): boolean {
        return !this.isValidCustomFilename(filename);
    }

    /**
     * Get filename without extension
     *
     * @param path - File path or filename
     * @returns Filename without extension
     */
    static getBasename(path: string): string {
        if (!path || typeof path !== 'string') {
            logger.warn('getBasename received invalid path', { path });
            return '';
        }

        // Extract filename if it's a full path
        const filename = path.includes('/') ?
            path.split('/').pop() || '' :
            path;

        // Remove extension
        const lastDot = filename.lastIndexOf('.');
        return lastDot === -1 ? filename : filename.substring(0, lastDot);
    }

    /**
     * Get appropriate file extension for a step type
     *
     * @param stepType - Type of step (e.g., 'whisper', 'gpt', 'claude')
     * @returns File extension including the dot (defaults to '.md')
     */
    static getExtensionForStepType(stepType?: string): string {
        if (!stepType) {
            return '.md';
        }

        return STEP_TYPE_EXTENSIONS[stepType.toLowerCase()] || '.md';
    }

    /**
     * Create a complete filename with appropriate extension
     *
     * @param basename - Filename without extension
     * @param stepType - Type of step for extension determination
     * @returns Complete filename with extension
     */
    static createCompleteFilename(basename: string, stepType?: string): string {
        const extension = this.getExtensionForStepType(stepType);
        return `${basename}${extension}`;
    }

    /**
     * Get a description of the filename source for logging
     *
     * @param llmSuggestion - Filename suggested by LLM
     * @param originalFilename - Original input filename
     * @returns Description of which source was used
     */
    static getFilenameSource(
        llmSuggestion: string | undefined
    ): string {
        if (llmSuggestion && this.isValidCustomFilename(llmSuggestion)) {
            return 'llm-provided';
        }
        return 'original-input';
    }
}
