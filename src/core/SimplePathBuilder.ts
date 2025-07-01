/**
 * Simple Path Builder System
 * 
 * Replaces the complex PathResolver with dead-simple directory + filename logic.
 * No templates, no variables, just string concatenation with safety checks.
 */

import { createLogger } from '../logger';

const logger = createLogger('SimplePathBuilder');

export class SimplePathBuilder {
    /**
     * Build an output file path from directory and filename components
     * 
     * @param directoryPath - Target directory path (should end with '/')
     * @param filename - Filename without extension
     * @param extension - File extension (should start with '.')
     * @returns Complete file path
     */
    static buildOutputPath(
        directoryPath: string, 
        filename: string, 
        extension: string = '.md'
    ): string {
        // Validate inputs
        if (!directoryPath || typeof directoryPath !== 'string') {
            throw new Error('Directory path is required and must be a string');
        }
        
        if (!filename || typeof filename !== 'string') {
            throw new Error('Filename is required and must be a string');
        }

        // Normalize directory path
        const normalizedDir = this.normalizeDirectoryPath(directoryPath);
        
        // Ensure extension starts with dot
        const normalizedExtension = extension.startsWith('.') ? extension : '.' + extension;
        
        // Build complete path
        const completePath = `${normalizedDir}${filename}${normalizedExtension}`;
        
        logger.debug('Built output path', {
            directoryPath,
            filename,
            extension,
            result: completePath
        });
        
        return completePath;
    }

    /**
     * Build an archive file path from directory and filename components
     * 
     * @param directoryPath - Archive directory path (should end with '/')
     * @param filename - Original filename with extension
     * @returns Complete archive file path
     */
    static buildArchivePath(directoryPath: string, filename: string): string {
        // Validate inputs
        if (!directoryPath || typeof directoryPath !== 'string') {
            throw new Error('Directory path is required and must be a string');
        }
        
        if (!filename || typeof filename !== 'string') {
            throw new Error('Filename is required and must be a string');
        }

        // Normalize directory path
        const normalizedDir = this.normalizeDirectoryPath(directoryPath);
        
        // For archive, preserve the original filename with extension
        const completePath = `${normalizedDir}${filename}`;
        
        logger.debug('Built archive path', {
            directoryPath,
            filename,
            result: completePath
        });
        
        return completePath;
    }

    /**
     * Normalize a directory path to ensure it's properly formatted
     * 
     * @param directoryPath - Directory path to normalize
     * @returns Normalized directory path ending with '/'
     */
    static normalizeDirectoryPath(directoryPath: string): string {
        if (!directoryPath || typeof directoryPath !== 'string') {
            throw new Error('Directory path must be a non-empty string');
        }

        // Convert backslashes to forward slashes
        let normalized = directoryPath.replace(/\\/g, '/');

        // Remove leading slashes to ensure vault-relative
        normalized = normalized.replace(/^\/+/, '');

        // Clean up double slashes
        normalized = normalized.replace(/\/+/g, '/');

        // Ensure trailing slash
        if (!normalized.endsWith('/')) {
            normalized += '/';
        }

        return normalized;
    }

    /**
     * Check if a path appears to be a directory path
     * 
     * @param path - Path to check
     * @returns True if path appears to be a directory
     */
    static isDirectoryPath(path: string): boolean {
        if (!path || typeof path !== 'string') {
            return false;
        }

        // Directory paths should end with '/'
        return path.endsWith('/');
    }

    /**
     * Extract directory path from a complete file path
     * 
     * @param filePath - Complete file path
     * @returns Directory portion of the path
     */
    static extractDirectoryPath(filePath: string): string {
        if (!filePath || typeof filePath !== 'string') {
            return '';
        }

        const lastSlash = filePath.lastIndexOf('/');
        if (lastSlash === -1) {
            return ''; // No directory, file is in root
        }

        return filePath.substring(0, lastSlash + 1); // Include trailing slash
    }

    /**
     * Extract filename from a complete file path
     * 
     * @param filePath - Complete file path
     * @returns Filename portion of the path
     */
    static extractFilename(filePath: string): string {
        if (!filePath || typeof filePath !== 'string') {
            return '';
        }

        const lastSlash = filePath.lastIndexOf('/');
        return lastSlash === -1 ? filePath : filePath.substring(lastSlash + 1);
    }

    /**
     * Validate that a directory path is properly formatted
     * 
     * @param directoryPath - Directory path to validate
     * @throws Error if path is invalid
     */
    static validateDirectoryPath(directoryPath: string): void {
        if (!directoryPath || typeof directoryPath !== 'string') {
            throw new Error('Directory path must be a non-empty string');
        }

        if (!directoryPath.endsWith('/')) {
            throw new Error('Directory path must end with "/" - got: ' + directoryPath);
        }

        // Check for path traversal attempts
        if (directoryPath.includes('..')) {
            throw new Error('Directory path cannot contain path traversal (..) - got: ' + directoryPath);
        }

        // Check for absolute paths (should be vault-relative)
        if (directoryPath.startsWith('/')) {
            throw new Error('Directory path should be vault-relative (no leading /) - got: ' + directoryPath);
        }
    }

    /**
     * Create a timestamped directory path for archiving
     * 
     * @param baseDirectory - Base archive directory
     * @param timestamp - Timestamp for the archive folder
     * @returns Timestamped archive directory path
     */
    static createTimestampedArchivePath(
        baseDirectory: string, 
        timestamp: string = new Date().toISOString().split('T')[0]
    ): string {
        const normalizedBase = this.normalizeDirectoryPath(baseDirectory);
        return `${normalizedBase}${timestamp}/`;
    }
}