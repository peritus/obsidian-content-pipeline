/**
 * Normalize a directory path to ensure proper formatting
 */

/**
 * Normalize directory path - internal version (no validation)
 * Converts backslashes, removes leading slashes, ensures trailing slash
 */
export function normalizeDirectoryPath(directoryPath: string): string {
    let normalized = directoryPath.replace(/\\/g, '/');
    normalized = normalized.replace(/^\/+/, '');
    normalized = normalized.replace(/\/+/g, '/');

    if (!normalized.endsWith('/')) {
        normalized += '/';
    }

    return normalized;
}
