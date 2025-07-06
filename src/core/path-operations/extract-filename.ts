/**
 * Extract filename from a complete file path
 */

export function extractFilename(filePath: string): string {
    const lastSlash = filePath.lastIndexOf('/');
    return lastSlash === -1 ? filePath : filePath.substring(lastSlash + 1);
}
