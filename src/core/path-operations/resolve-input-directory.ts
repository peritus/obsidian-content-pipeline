/**
 * Resolve input directory pattern to actual directory path
 * PUBLIC API - includes validation for external calls
 */

import { normalizeDirectoryPath } from './normalize-directory-path';

export function resolveInputDirectory(inputPattern: string): string {
    // Validate at boundary - this is a public API function
    if (!inputPattern || typeof inputPattern !== 'string') {
        throw new Error('Input pattern must be a non-empty string');
    }

    const trimmed = inputPattern.trim();
    if (!trimmed) {
        throw new Error('Input pattern cannot be empty');
    }

    return normalizeDirectoryPath(trimmed);
}
