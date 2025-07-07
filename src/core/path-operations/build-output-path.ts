/**
 * Build an output file path from directory and filename components
 */

import { normalizeDirectoryPath } from './normalize-directory-path';

export function buildOutputPath(
    directoryPath: string,
    filename: string,
    extension: string = '.md'
): string {
    const normalizedDir = normalizeDirectoryPath(directoryPath);
    const normalizedExtension = extension.startsWith('.') ? extension : '.' + extension;
    return `${normalizedDir}${filename}${normalizedExtension}`;
}
