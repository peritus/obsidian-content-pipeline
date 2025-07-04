/**
 * Simple Path Builder System
 * 
 * Replaces the complex PathResolver with dead-simple directory + filename logic.
 * No templates, no variables, just string concatenation with safety checks.
 */

import { createLogger } from '../logger';
import { 
    inputPatternSchema, 
    directoryPathInputSchema, 
    filenameInputSchema, 
    filePathInputSchema 
} from '../validation/schemas';
import * as v from 'valibot';

const logger = createLogger('SimplePathBuilder');

export class SimplePathBuilder {
    // =====================================
    // INPUT DISCOVERY METHODS (replaces PathResolver)
    // =====================================

    /**
     * Resolve input directory pattern to actual directory path
     * 
     * Replaces PathResolver.resolvePath() with simple directory resolution
     * No variable substitution - just direct path normalization
     */
    static resolveInputDirectory(inputPattern: string): string {
        v.parse(inputPatternSchema, inputPattern);

        // Simple normalization - no variable substitution needed
        return this.normalizeDirectoryPath(inputPattern);
    }

    /**
     * Check if a file path matches an input pattern
     * 
     * Replaces complex PathResolver logic with simple prefix matching
     */
    static matchesInputPattern(filePath: string, inputPattern: string): boolean {
        if (!filePath || !inputPattern) {
            return false;
        }

        try {
            const resolvedInputPath = this.resolveInputDirectory(inputPattern);
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

    // =====================================
    // OUTPUT FILE BUILDING METHODS
    // =====================================

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
        // Validate inputs using Valibot schemas
        v.parse(directoryPathInputSchema, directoryPath);
        v.parse(filenameInputSchema, filename);

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
        // Validate inputs using Valibot schemas
        v.parse(directoryPathInputSchema, directoryPath);
        v.parse(filenameInputSchema, filename);

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
        v.parse(directoryPathInputSchema, directoryPath);

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
        try {
            v.parse(filePathInputSchema, path);
            // Directory paths should end with '/'
            return path.endsWith('/');
        } catch {
            return false;
        }
    }

    /**
     * Extract directory path from a complete file path
     * 
     * @param filePath - Complete file path
     * @returns Directory portion of the path
     */
    static extractDirectoryPath(filePath: string): string {
        try {
            v.parse(filePathInputSchema, filePath);
        } catch {
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
        try {
            v.parse(filePathInputSchema, filePath);
        } catch {
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
        v.parse(directoryPathInputSchema, directoryPath);
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