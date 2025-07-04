/**
 * File discovery and search operations
 * 
 * Unified file discovery system supporting both generic file search and pipeline-specific operations.
 */

import { App, TFile, TFolder, Vault, normalizePath } from 'obsidian';
import { SimplePathBuilder } from '../SimplePathBuilder';
import { FileInfo, PipelineConfiguration, isRoutingAwareOutput } from '../../types';
import { FileDiscoveryOptions, FileDiscoveryResult } from './types';
import { FileInfoProvider } from './file-info-provider';
import { ContentPipelineError } from '../../errors';
import { createLogger } from '../../logger';

const logger = createLogger('FileDiscovery');

export class FileDiscovery {
    private vault: Vault;
    private fileInfoProvider: FileInfoProvider;

    constructor(app: App) {
        this.vault = app.vault;
        this.fileInfoProvider = new FileInfoProvider();
    }

    // =====================================
    // GENERIC FILE DISCOVERY METHODS
    // =====================================

    /**
     * Discover files matching a pattern
     */
    async discoverFiles(
        inputPattern: string,
        context: Record<string, any> = {},
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
            // Resolve the search pattern using SimplePathBuilder
            const searchPath = SimplePathBuilder.resolveInputDirectory(inputPattern);

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
            throw new ContentPipelineError(`Failed to discover files: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error : undefined);
        }
    }

    /**
     * Discover files in multiple input patterns (for multiple entry points)
     */
    async discoverFilesMultiple(
        inputPatterns: string[],
        context: Record<string, any> = {},
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

    // =====================================
    // PIPELINE-SPECIFIC DISCOVERY METHODS
    // =====================================

    /**
     * Find the next available file for processing across all pipeline steps
     */
    async findNextAvailableFile(
        config: PipelineConfiguration,
        excludeFiles: Set<string>
    ): Promise<FileDiscoveryResult | null> {
        const allSteps = Object.keys(config);
        
        if (allSteps.length === 0) {
            throw new ContentPipelineError('No steps found in pipeline configuration');
        }

        logger.debug(`Searching for files in ${allSteps.length} steps: ${allSteps.join(', ')}`);

        // Sort steps to prioritize entry points first, then other steps
        const entryPoints = this.findEntryPoints(config);
        const nonEntryPoints = allSteps.filter(stepId => !entryPoints.includes(stepId));
        const stepsToCheck = [...entryPoints, ...nonEntryPoints];

        for (const stepId of stepsToCheck) {
            const step = config[stepId];
            
            try {
                const files = await this.discoverFiles(step.input, {}, {
                    extensions: ['.mp3', '.wav', '.m4a', '.mp4', '.md', '.txt'],
                    sortBy: 'name',
                    sortOrder: 'asc',
                    limit: 1
                });

                const availableFiles = files.filter(file => 
                    !excludeFiles.has(file.path)
                );

                if (availableFiles.length > 0) {
                    const file = availableFiles[0];
                    logger.debug(`Found file for processing: ${file.path} in step: ${stepId}`);
                    return { file, stepId };
                }
            } catch (error) {
                logger.warn(`Error searching for files in step ${stepId}:`, error);
                continue;
            }
        }

        logger.debug('No files found for processing across all steps');
        return null;
    }

    /**
     * Check if a specific file can be processed by any step in the pipeline (synchronous)
     */
    canFileBeProcessedSync(
        file: TFile,
        config: PipelineConfiguration
    ): boolean {
        // Quick synchronous check without file system operations
        const supportedExtensions = ['.mp3', '.wav', '.m4a', '.mp4', '.md', '.txt'];
        const fileExtension = file.extension ? `.${file.extension}` : '';
        
        // Check if file has supported extension
        if (!supportedExtensions.includes(fileExtension.toLowerCase())) {
            logger.debug(`File ${file.path} has unsupported extension: ${fileExtension}`);
            return false;
        }

        // Check if file path matches any step's input pattern
        const stepId = this.findStepForFileSync(file, config);
        const canProcess = stepId !== null;
        
        if (canProcess) {
            logger.debug(`File ${file.path} can be processed by step: ${stepId} (sync check)`);
        } else {
            logger.debug(`File ${file.path} cannot be processed by any step (sync check)`);
        }
        
        return canProcess;
    }

    /**
     * Check if a specific file can be processed by any step in the pipeline (async)
     */
    async canFileBeProcessed(
        file: TFile,
        config: PipelineConfiguration
    ): Promise<boolean> {
        const stepId = await this.findStepForFile(file, config);
        return stepId !== null;
    }

    /**
     * Find which step can process a specific file (synchronous)
     */
    findStepForFileSync(
        file: TFile,
        config: PipelineConfiguration
    ): string | null {
        const allSteps = Object.keys(config);
        
        for (const stepId of allSteps) {
            const step = config[stepId];
            
            try {
                // Use path matching to check if file is in step's input directory
                if (this.isFileInInputDirectory(file.path, step.input)) {
                    logger.debug(`File ${file.path} matches step ${stepId} input pattern: ${step.input}`);
                    return stepId;
                }
            } catch (error) {
                logger.debug(`Could not check step ${stepId} for file ${file.path}:`, error);
                continue;
            }
        }

        return null;
    }

    /**
     * Find which step can process a specific file (async with full discovery)
     */
    async findStepForFile(
        file: TFile,
        config: PipelineConfiguration
    ): Promise<string | null> {
        const allSteps = Object.keys(config);
        
        for (const stepId of allSteps) {
            const step = config[stepId];
            
            try {
                // Use FileDiscovery to check if this file would be discovered in this step's input directory
                const files = await this.discoverFiles(step.input, {}, {
                    extensions: ['.mp3', '.wav', '.m4a', '.mp4', '.md', '.txt'], // Same as findNextAvailableFile
                    sortBy: 'name',
                    sortOrder: 'asc'
                });

                // Check if our target file is in the discovered files
                const matchingFile = files.find(discoveredFile => 
                    discoveredFile.path === file.path
                );

                if (matchingFile) {
                    logger.debug(`File ${file.path} can be processed by step: ${stepId}`);
                    return stepId;
                }
            } catch (error) {
                // Continue checking other steps if this one fails
                logger.debug(`Could not check step ${stepId} for file ${file.path}:`, error);
                continue;
            }
        }

        logger.debug(`File ${file.path} cannot be processed by any step`);
        return null;
    }

    /**
     * Find entry points in the pipeline (steps not referenced by others via routing-aware output)
     */
    findEntryPoints(config: PipelineConfiguration): string[] {
        const allSteps = Object.keys(config);
        const referencedSteps = new Set<string>();

        allSteps.forEach(stepId => {
            const step = config[stepId];
            
            // Check routing-aware output for referenced next steps
            if (step.routingAwareOutput && isRoutingAwareOutput(step.routingAwareOutput)) {
                Object.keys(step.routingAwareOutput).forEach(nextStepId => {
                    // Skip 'default' key as it's not a step reference
                    if (nextStepId !== 'default') {
                        referencedSteps.add(nextStepId);
                    }
                });
            }
        });

        return allSteps.filter(stepId => !referencedSteps.has(stepId));
    }

    // =====================================
    // PRIVATE HELPER METHODS
    // =====================================

    /**
     * Check if a file path is within a step's input directory pattern (synchronous)
     */
    private isFileInInputDirectory(filePath: string, inputPattern: string): boolean {
        try {
            // Use SimplePathBuilder for pattern matching
            const isMatch = SimplePathBuilder.matchesInputPattern(filePath, inputPattern);
            
            logger.debug(`Path check: ${filePath} in ${inputPattern} = ${isMatch}`);
            return isMatch;
            
        } catch (error) {
            logger.debug(`Error checking path ${filePath} against pattern ${inputPattern}:`, error);
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