/**
 * Build an archive file path from directory and filename components
 */

import { normalizeDirectoryPath } from './normalize-directory-path';

export function buildArchivePath(directoryPath: string, filename: string): string {
    const normalizedDir = normalizeDirectoryPath(directoryPath);
    return `${normalizedDir}${filename}`;
}
