/**
 * File discovery and search operations
 */

import { App, TFile, TFolder, Vault, normalizePath } from 'obsidian';
import { PathResolver } from '../path-resolver';
import { PathContext, FileInfo } from '../../types';
import { FileDiscoveryOptions } from './types';
import { FileInfoProvider } from './file-info-provider';
import { ErrorFactory } from '../../error-handler';
import { createLogger } from '../../logger';

const logger = createLogger('FileDiscovery');

export class FileDiscovery {
    private vault: Vault;
    private fileInfoProvider: FileInfoProvider;

    constructor(app: App) {
        this.vault = app.vault;
        this.fileInfoProvider = new FileInfoProvider();
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
            // Resolve the search pattern
            const result = PathResolver.resolvePath(inputPattern, context, { 
                throwOnMissing: false,
                validateResult: false 
            });
            const searchPath = result.resolvedPath;

            // Search for files in the resolved path
            const files = await this.searchFilesInPath(searchPath, {
                extensions,
                recursive,
                includeHidden
            });

            // Sort files
            this.fileInfoProvider.sortFiles(files, sortBy, sortOrder);

            // Apply limit
            const limitedFiles = limit > 0 ? files.slice(0, limit) : files;

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
     * Discover files in multiple input patterns (for multiple entry points)
     */
    async discoverFilesMultiple(
        inputPatterns: string[],
        context: Partial<PathContext> = {},
        options: FileDiscoveryOptions = {}
    ): Promise<FileInfo[]> {
        const allFiles: FileInfo[] = [];

        for (const pattern of inputPatterns) {
            try {
                const files = await this.discoverFiles(pattern, context, options);
                allFiles.push(...files);
            } catch (error) {
                logger.warn(`Failed to discover files for pattern: ${pattern}`, error);
                // Continue with other patterns even if one fails
            }
        }

        // Sort combined results
        this.fileInfoProvider.sortFiles(allFiles, options.sortBy || 'name', options.sortOrder || 'asc');

        // Apply limit to combined results
        const limit = options.limit || 100;
        const limitedFiles = limit > 0 ? allFiles.slice(0, limit) : allFiles;

        logger.debug(`Discovered ${limitedFiles.length} files total from ${inputPatterns.length} patterns`);
        return limitedFiles;
    }

    /**
     * Get file information
     */
    getFileInfo(file: TFile): FileInfo {
        return this.fileInfoProvider.getFileInfo(file);
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
                if (this.fileInfoProvider.shouldIncludeFile(abstractFile, extensions, includeHidden)) {
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
                    if (this.fileInfoProvider.shouldIncludeFile(file, extensions, includeHidden)) {
                        files.push(this.getFileInfo(file));
                    }
                }
            }
        } catch (error) {
            logger.warn(`Error searching path: ${searchPath}`, error);
        }

        return files;
    }
}