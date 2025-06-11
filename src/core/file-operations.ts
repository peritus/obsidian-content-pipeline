/**
 * File Operations System for Audio Inbox Plugin
 * 
 * This module provides vault-aware file operations that integrate with Obsidian's
 * file system, supporting the full pipeline workflow with proper error handling.
 */

import { App, TFile, TFolder, Vault, normalizePath } from 'obsidian';
import { PathResolver, PathUtils } from './path-resolver';
import { PathContext, FileInfo, ProcessingStatus } from '../types';
import { ErrorFactory } from '../error-handler';
import { createLogger } from '../logger';

const logger = createLogger('FileOperations');

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
 * File operations class for vault-aware file management
 */
export class FileOperations {
    private app: App;
    private vault: Vault;

    constructor(app: App) {
        this.app = app;
        this.vault = app.vault;
        logger.debug('FileOperations initialized');
    }

    /**
     * Read a file from the vault
     */
    async readFile(
        filePath: string, 
        options: FileOperationOptions = {}
    ): Promise<string> {
        const { validatePaths = true } = options;

        try {
            // Validate path if requested
            if (validatePaths) {
                const normalizedPath = normalizePath(filePath);
                if (normalizedPath !== filePath) {
                    logger.debug(`Path normalized: ${filePath} → ${normalizedPath}`);
                    filePath = normalizedPath;
                }
            }

            // Get the file object
            const file = this.vault.getAbstractFileByPath(filePath);
            
            if (!file) {
                throw ErrorFactory.fileSystem(
                    `File not found: ${filePath}`,
                    `Could not find file: ${filePath}`,
                    { filePath },
                    ['Check if the file exists', 'Verify the file path', 'Ensure file is in vault']
                );
            }

            if (!(file instanceof TFile)) {
                throw ErrorFactory.fileSystem(
                    `Path is not a file: ${filePath}`,
                    `Path points to a directory, not a file: ${filePath}`,
                    { filePath, fileType: file.constructor.name },
                    ['Use a file path, not a directory path', 'Check the path specification']
                );
            }

            // Read the file content
            const content = await this.vault.read(file);
            
            logger.debug(`File read successfully: ${filePath} (${content.length} chars)`);
            return content;

        } catch (error) {
            if (error instanceof Error && error.name === 'AudioInboxError') {
                throw error; // Re-throw our custom errors
            }

            throw ErrorFactory.fileSystem(
                `Failed to read file: ${error instanceof Error ? error.message : String(error)}`,
                `Could not read file: ${filePath}`,
                { filePath, originalError: error },
                ['Check file permissions', 'Verify file is not corrupted', 'Ensure file is readable']
            );
        }
    }

    /**
     * Write content to a file in the vault
     */
    async writeFile(
        filePath: string,
        content: string,
        options: FileOperationOptions = {}
    ): Promise<FileOperationResult> {
        const { 
            createDirectories = true, 
            overwrite = false, 
            validatePaths = true 
        } = options;

        const timestamp = new Date();

        try {
            // Validate and normalize path
            if (validatePaths) {
                const normalizedPath = normalizePath(filePath);
                if (normalizedPath !== filePath) {
                    logger.debug(`Path normalized: ${filePath} → ${normalizedPath}`);
                    filePath = normalizedPath;
                }
            }

            // Create parent directories if needed
            if (createDirectories) {
                const directory = PathUtils.getDirectory(filePath);
                if (directory) {
                    await this.ensureDirectory(directory);
                }
            }

            // Check if file already exists
            const existingFile = this.vault.getAbstractFileByPath(filePath);
            if (existingFile && !overwrite) {
                throw ErrorFactory.fileSystem(
                    `File already exists: ${filePath}`,
                    `File already exists and overwrite is disabled: ${filePath}`,
                    { filePath, overwrite },
                    ['Enable overwrite option', 'Use a different filename', 'Delete existing file first']
                );
            }

            let file: TFile;

            if (existingFile instanceof TFile) {
                // Modify existing file
                await this.vault.modify(existingFile, content);
                file = existingFile;
                logger.debug(`File modified: ${filePath} (${content.length} chars)`);
            } else {
                // Create new file
                file = await this.vault.create(filePath, content);
                logger.debug(`File created: ${filePath} (${content.length} chars)`);
            }

            return {
                success: true,
                path: filePath,
                file,
                timestamp
            };

        } catch (error) {
            if (error instanceof Error && error.name === 'AudioInboxError') {
                throw error; // Re-throw our custom errors
            }

            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error(`Failed to write file: ${filePath}`, { error: errorMessage });

            return {
                success: false,
                path: filePath,
                error: errorMessage,
                timestamp
            };
        }
    }

    /**
     * Ensure a directory exists, creating it if necessary
     */
    async ensureDirectory(dirPath: string): Promise<TFolder> {
        try {
            const normalizedPath = normalizePath(dirPath);
            
            // Check if directory already exists
            const existing = this.vault.getAbstractFileByPath(normalizedPath);
            if (existing instanceof TFolder) {
                logger.debug(`Directory already exists: ${normalizedPath}`);
                return existing;
            }

            if (existing instanceof TFile) {
                throw ErrorFactory.fileSystem(
                    `Path exists as file, not directory: ${normalizedPath}`,
                    `Cannot create directory: path is already a file`,
                    { dirPath: normalizedPath },
                    ['Use a different directory path', 'Remove the existing file']
                );
            }

            // Create the directory
            const folder = await this.vault.createFolder(normalizedPath);
            logger.debug(`Directory created: ${normalizedPath}`);
            return folder;

        } catch (error) {
            if (error instanceof Error && error.name === 'AudioInboxError') {
                throw error; // Re-throw our custom errors
            }

            throw ErrorFactory.fileSystem(
                `Failed to create directory: ${error instanceof Error ? error.message : String(error)}`,
                `Could not create directory: ${dirPath}`,
                { dirPath, originalError: error },
                ['Check parent directory exists', 'Verify permissions', 'Ensure valid directory name']
            );
        }
    }

    /**
     * Move a file to archive location
     */
    async archiveFile(
        sourceFilePath: string,
        archivePattern: string,
        context: PathContext,
        options: FileOperationOptions = {}
    ): Promise<ArchiveResult> {
        try {
            // Resolve the archive path
            const archiveResult = PathResolver.resolvePath(archivePattern, context);
            if (!archiveResult.isComplete) {
                throw ErrorFactory.fileSystem(
                    `Cannot resolve archive path: missing variables ${archiveResult.missingVariables.join(', ')}`,
                    'Cannot determine archive location',
                    { archivePattern, context, missingVariables: archiveResult.missingVariables },
                    ['Provide all required variables for archive path', 'Check archive pattern configuration']
                );
            }

            const archivePath = archiveResult.resolvedPath;

            // Get source file
            const sourceFile = this.vault.getAbstractFileByPath(sourceFilePath);
            if (!sourceFile || !(sourceFile instanceof TFile)) {
                throw ErrorFactory.fileSystem(
                    `Source file not found: ${sourceFilePath}`,
                    `Cannot archive file: source file not found`,
                    { sourceFilePath },
                    ['Check if source file exists', 'Verify file path']
                );
            }

            // Ensure archive directory exists
            const archiveDir = PathUtils.getDirectory(archivePath);
            if (archiveDir) {
                await this.ensureDirectory(archiveDir);
            }

            // Generate unique archive filename if needed
            const finalArchivePath = await this.generateUniqueFilename(archivePath);

            // Move the file
            await this.vault.rename(sourceFile, finalArchivePath);

            // Get the archived file
            const archivedFile = this.vault.getAbstractFileByPath(finalArchivePath) as TFile;

            logger.info(`File archived: ${sourceFilePath} → ${finalArchivePath}`);

            return {
                success: true,
                originalPath: sourceFilePath,
                archivePath: finalArchivePath,
                archivedFile
            };

        } catch (error) {
            if (error instanceof Error && error.name === 'AudioInboxError') {
                throw error; // Re-throw our custom errors
            }

            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error(`Failed to archive file: ${sourceFilePath}`, { error: errorMessage });

            return {
                success: false,
                originalPath: sourceFilePath,
                archivePath: '',
                error: errorMessage
            };
        }
    }

    /**
     * Discover files matching a pattern
     */
    async discoverFiles(
        inputPattern: string,
        context: Partial<PathContext> = {},
        options: FileDiscoveryOptions = {}
    ): Promise<FileInfo[]> {
        const {
            extensions = [],
            recursive = true,
            limit = 100,
            includeHidden = false,
            sortBy = 'name',
            sortOrder = 'asc'
        } = options;

        try {
            // If pattern contains variables, we need to expand across categories
            const variables = PathResolver.extractVariables(inputPattern);
            const needsCategoryExpansion = variables.includes('category');

            let searchPaths: string[] = [];

            if (needsCategoryExpansion && !context.category) {
                // Expand pattern for common categories
                const defaultCategories = ['tasks', 'thoughts', 'uncategorized'];
                searchPaths = defaultCategories.map(category => {
                    const expandedContext = { ...context, category };
                    const result = PathResolver.resolvePath(inputPattern, expandedContext, { 
                        throwOnMissing: false,
                        validateResult: false 
                    });
                    return result.resolvedPath;
                });
            } else {
                // Resolve single pattern
                const result = PathResolver.resolvePath(inputPattern, context, { 
                    throwOnMissing: false,
                    validateResult: false 
                });
                searchPaths = [result.resolvedPath];
            }

            const allFiles: FileInfo[] = [];

            // Search in each path
            for (const searchPath of searchPaths) {
                const files = await this.searchFilesInPath(searchPath, {
                    extensions,
                    recursive,
                    includeHidden
                });
                allFiles.push(...files);
            }

            // Sort files
            this.sortFiles(allFiles, sortBy, sortOrder);

            // Apply limit
            const limitedFiles = limit > 0 ? allFiles.slice(0, limit) : allFiles;

            logger.debug(`Discovered ${limitedFiles.length} files matching pattern: ${inputPattern}`);
            return limitedFiles;

        } catch (error) {
            throw ErrorFactory.fileSystem(
                `Failed to discover files: ${error instanceof Error ? error.message : String(error)}`,
                'Could not search for files',
                { inputPattern, context, originalError: error },
                ['Check search pattern', 'Verify directory exists', 'Check permissions']
            );
        }
    }

    /**
     * Get file information
     */
    getFileInfo(file: TFile): FileInfo {
        const path = file.path;
        const extension = PathUtils.getExtension(path);
        const isProcessable = this.isProcessableFile(extension);
        
        // Extract category from path if possible
        let category = 'uncategorized';
        const pathParts = path.split('/');
        if (pathParts.length >= 2) {
            // Try to find category in common locations like inbox/audio/{category}
            for (let i = 0; i < pathParts.length - 1; i++) {
                if (pathParts[i] === 'audio' || pathParts[i] === 'transcripts' || 
                    pathParts[i] === 'results' || pathParts[i] === 'summary') {
                    if (i + 1 < pathParts.length - 1) {
                        category = pathParts[i + 1];
                        break;
                    }
                }
            }
        }

        return {
            name: file.name,
            path: file.path,
            size: file.stat.size,
            extension,
            category,
            isProcessable,
            lastModified: new Date(file.stat.mtime),
            mimeType: this.getMimeType(extension)
        };
    }

    /**
     * Check if a file exists
     */
    fileExists(filePath: string): boolean {
        const file = this.vault.getAbstractFileByPath(normalizePath(filePath));
        return file instanceof TFile;
    }

    /**
     * Check if a directory exists
     */
    directoryExists(dirPath: string): boolean {
        const dir = this.vault.getAbstractFileByPath(normalizePath(dirPath));
        return dir instanceof TFolder;
    }

    /**
     * Delete a file
     */
    async deleteFile(filePath: string): Promise<boolean> {
        try {
            const file = this.vault.getAbstractFileByPath(filePath);
            if (!file || !(file instanceof TFile)) {
                throw ErrorFactory.fileSystem(
                    `File not found: ${filePath}`,
                    `Cannot delete file: file not found`,
                    { filePath }
                );
            }

            await this.vault.delete(file);
            logger.debug(`File deleted: ${filePath}`);
            return true;

        } catch (error) {
            if (error instanceof Error && error.name === 'AudioInboxError') {
                throw error;
            }

            logger.error(`Failed to delete file: ${filePath}`, error);
            return false;
        }
    }

    /**
     * Search for files in a specific path
     */
    private async searchFilesInPath(
        searchPath: string,
        options: Pick<FileDiscoveryOptions, 'extensions' | 'recursive' | 'includeHidden'>
    ): Promise<FileInfo[]> {
        const { extensions = [], recursive = true, includeHidden = false } = options;
        const files: FileInfo[] = [];

        try {
            const normalizedPath = normalizePath(searchPath);
            const abstractFile = this.vault.getAbstractFileByPath(normalizedPath);

            if (!abstractFile) {
                // Path doesn't exist, return empty array
                return files;
            }

            if (abstractFile instanceof TFile) {
                // Single file
                if (this.shouldIncludeFile(abstractFile, extensions, includeHidden)) {
                    files.push(this.getFileInfo(abstractFile));
                }
            } else if (abstractFile instanceof TFolder) {
                // Directory - search recursively
                const foundFiles = recursive 
                    ? this.vault.getMarkdownFiles() // Get all markdown files
                        .concat(this.vault.getFiles().filter(f => !f.path.endsWith('.md'))) // Plus other files
                        .filter(f => f.path.startsWith(normalizedPath))
                    : abstractFile.children.filter(child => child instanceof TFile) as TFile[];

                for (const file of foundFiles) {
                    if (this.shouldIncludeFile(file, extensions, includeHidden)) {
                        files.push(this.getFileInfo(file));
                    }
                }
            }
        } catch (error) {
            logger.warn(`Error searching path: ${searchPath}`, error);
        }

        return files;
    }

    /**
     * Check if a file should be included in results
     */
    private shouldIncludeFile(
        file: TFile, 
        extensions: string[], 
        includeHidden: boolean
    ): boolean {
        // Check hidden files
        if (!includeHidden && file.name.startsWith('.')) {
            return false;
        }

        // Check extensions
        if (extensions.length > 0) {
            const fileExt = PathUtils.getExtension(file.path);
            return extensions.includes(fileExt);
        }

        return true;
    }

    /**
     * Sort files based on criteria
     */
    private sortFiles(files: FileInfo[], sortBy: string, sortOrder: string): void {
        files.sort((a, b) => {
            let comparison = 0;

            switch (sortBy) {
                case 'name':
                    comparison = a.name.localeCompare(b.name);
                    break;
                case 'modified':
                    comparison = a.lastModified.getTime() - b.lastModified.getTime();
                    break;
                case 'size':
                    comparison = a.size - b.size;
                    break;
                default:
                    comparison = a.name.localeCompare(b.name);
            }

            return sortOrder === 'desc' ? -comparison : comparison;
        });
    }

    /**
     * Generate a unique filename to avoid conflicts
     */
    private async generateUniqueFilename(basePath: string): Promise<string> {
        let counter = 0;
        let testPath = basePath;

        while (this.fileExists(testPath)) {
            counter++;
            const dir = PathUtils.getDirectory(basePath);
            const basename = PathUtils.getBasename(basePath);
            const extension = PathUtils.getExtension(basePath);
            const uniqueName = `${basename}-${counter}${extension}`;
            testPath = dir ? PathUtils.join(dir, uniqueName) : uniqueName;
        }

        return testPath;
    }

    /**
     * Check if a file extension is processable
     */
    private isProcessableFile(extension: string): boolean {
        const processableExtensions = ['.mp3', '.wav', '.m4a', '.mp4', '.md', '.txt'];
        return processableExtensions.includes(extension.toLowerCase());
    }

    /**
     * Get MIME type for file extension
     */
    private getMimeType(extension: string): string | undefined {
        const mimeTypes: Record<string, string> = {
            '.mp3': 'audio/mpeg',
            '.wav': 'audio/wav',
            '.m4a': 'audio/mp4',
            '.mp4': 'video/mp4',
            '.md': 'text/markdown',
            '.txt': 'text/plain'
        };

        return mimeTypes[extension.toLowerCase()];
    }
}

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
        category: fileInfo.category,
        filename: PathUtils.getBasename(fileInfo.path),
        stepId,
        timestamp: FileUtils.generateTimestamp(),
        date: new Date().toISOString().split('T')[0]
    })
};

/**
 * Default export for convenience
 */
export default FileOperations;