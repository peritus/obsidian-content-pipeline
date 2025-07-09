/**
 * File operation utility functions
 */

import { App, normalizePath } from 'obsidian';
import { FileOperations } from './file-operations';

/**
 * Utility functions for file operations
 */
export const FileUtils = {
    /**
     * Create FileOperations instance from app
     */
    create: (app: App) => new FileOperations(app),

    /**
     * Check if a path is safe for vault operations
     */
    isVaultSafePath: (path: string): boolean => {
        const normalized = normalizePath(path);
        return normalized === path &&
               !path.includes('..') &&
               !path.startsWith('/') &&
               path.length > 0;
    },

    /**
     * Get processable file extensions
     */
    getProcessableExtensions: (): string[] => ['.mp3', '.wav', '.m4a', '.mp4', '.md', '.txt'],

    /**
     * Check if file extension is processable
     */
    isProcessableExtension: (extension: string): boolean => {
        return FileUtils.getProcessableExtensions().includes(extension.toLowerCase());
    },

    /**
     * Generate timestamp for file operations
     */
    generateTimestamp: (): string => new Date().toISOString(),

    /**
     * Strip YAML frontmatter from markdown content and return only the body content
     *
     * This prevents doubled frontmatter when processing files that already have frontmatter.
     * For files without frontmatter, returns the original content unchanged.
     *
     * @param content - Full file content that may contain YAML frontmatter
     * @returns The content without frontmatter, or original content if no frontmatter found
     */
    stripFrontmatter: (content: string): string => {
        const trimmed = content.trim();

        // Check if content starts with YAML frontmatter
        if (!trimmed.startsWith('---')) {
            return content; // No frontmatter, return as-is
        }

        const lines = trimmed.split('\n');
        let frontmatterEnd = -1;

        // Find the closing --- delimiter
        for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim() === '---') {
                frontmatterEnd = i;
                break;
            }
        }

        // If no closing delimiter found, treat as regular content (not valid frontmatter)
        if (frontmatterEnd === -1) {
            return content;
        }

        // Extract content after frontmatter
        const bodyContent = lines.slice(frontmatterEnd + 1).join('\n').trim();
        return bodyContent;
    }
};
