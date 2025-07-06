/**
 * Check if a file path matches an input pattern
 * PUBLIC API - includes validation for external calls
 */

import { resolveInputDirectory } from './resolve-input-directory';
import { createLogger } from '../../logger';

const logger = createLogger('MatchInputPattern');

export function matchesInputPattern(filePath: string, inputPattern: string): boolean {
    if (!filePath || !inputPattern) {
        return false;
    }

    try {
        const resolvedInputPath = resolveInputDirectory(inputPattern);
        const normalizedFilePath = filePath.replace(/\\/g, '/');
        
        // Remove trailing slash from input path for comparison
        const cleanInputPath = resolvedInputPath.endsWith('/') 
            ? resolvedInputPath.slice(0, -1)
            : resolvedInputPath;
        
        // Check if file path starts with the input directory path
        return normalizedFilePath.startsWith(cleanInputPath + '/');
    } catch (error) {
        logger.debug(`Error matching path ${filePath} against pattern ${inputPattern}:`, error);
        return false;
    }
}
