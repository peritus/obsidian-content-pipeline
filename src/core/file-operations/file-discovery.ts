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
            this.fileInfoProvider.sortFiles(allFiles, sortBy, sortOrder);

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
