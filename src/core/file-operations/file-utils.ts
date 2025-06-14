/**
 * File operation utility functions
 */

import { App, normalizePath } from 'obsidian';
import { FileOperations } from './file-operations';
import { PathUtils } from '../path-resolver';
import { FileInfo, PathContext } from '../../types';

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
     * Create processing context from file info
     */
    createProcessingContext: (fileInfo: FileInfo, stepId?: string): PathContext => ({
        filename: PathUtils.getBasename(fileInfo.path),
        stepId,
        timestamp: FileUtils.generateTimestamp(),
        date: new Date().toISOString().split('T')[0]
    })
};
