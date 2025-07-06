/**
 * Extract directory path from a complete file path
 */

export function extractDirectoryPath(filePath: string): string {
    const lastSlash = filePath.lastIndexOf('/');
    if (lastSlash === -1) {
        return ''; // No directory, file is in root
    }
    return filePath.substring(0, lastSlash + 1); // Include trailing slash
}
