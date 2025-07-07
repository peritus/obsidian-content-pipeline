/**
 * Type definitions for file operations
 */

import { TFile, TFolder } from 'obsidian';
import { FileInfo } from '../../types';

/**
 * Options for file operations
 */
export interface FileOperationOptions {
    /** Whether to create parent directories if they don't exist */
    createDirectories?: boolean;
    /** Whether to overwrite existing files */
    overwrite?: boolean;
    /** Whether to validate paths before operations */
    validatePaths?: boolean;
    /** Encoding for text files (default: utf8) */
    encoding?: string;
}

/**
 * Result of a file operation
 */
export interface FileOperationResult {
    /** Whether the operation was successful */
    success: boolean;
    /** Path of the affected file */
    path: string;
    /** File object if operation was successful */
    file?: TFile;
    /** Error message if operation failed */
    error?: string;
    /** Timestamp of the operation */
    timestamp: Date;
}

/**
 * File discovery options
 */
export interface FileDiscoveryOptions {
    /** File extensions to include (e.g., ['.md', '.txt']) */
    extensions?: string[];
    /** Whether to search recursively in subdirectories */
    recursive?: boolean;
    /** Maximum number of files to return */
    limit?: number;
    /** Whether to include hidden files */
    includeHidden?: boolean;
    /** Sort order for results */
    sortBy?: 'name' | 'modified' | 'created' | 'size';
    /** Sort direction */
    sortOrder?: 'asc' | 'desc';
}

/**
 * Result of file discovery for pipeline processing
 */
export interface FileDiscoveryResult {
    file: FileInfo;
    stepId: string;
}

/**
 * Archive operation result
 */
export interface ArchiveResult {
    /** Whether the operation was successful */
    success: boolean;
    /** Original file path */
    originalPath: string;
    /** New archive path */
    archivePath: string;
    /** Archive file object */
    archivedFile?: TFile;
    /** Error if operation failed */
    error?: string;
}

/**
 * Folder structure creation result
 */
export interface FolderStructureResult {
    /** Whether the operation was successful */
    success: boolean;
    /** Number of folders created */
    foldersCreated: number;
    /** List of created folder paths */
    createdPaths: string[];
    /** Any errors that occurred */
    errors: string[];
}
