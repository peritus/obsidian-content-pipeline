/**
 * File writing operations
 */

import { App, TFile, Vault, normalizePath } from 'obsidian';
import { extractDirectoryPath } from '../path-operations/extract-directory-path';
import { FileOperationOptions, FileOperationResult } from './types';
import { DirectoryManager } from './directory-manager';
import { ContentPipelineError, isContentPipelineError } from '../../errors';
import { createLogger } from '../../logger';

const logger = createLogger('FileWriter');

export class FileWriter {
    private vault: Vault;
    private directoryManager: DirectoryManager;

    constructor(app: App) {
        this.vault = app.vault;
        this.directoryManager = new DirectoryManager(app);
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
                const directory = extractDirectoryPath(filePath);
                if (directory) {
                    await this.directoryManager.ensureDirectory(directory);
                }
            }

            // Check if file already exists
            const existingFile = this.vault.getAbstractFileByPath(filePath);
            if (existingFile && !overwrite) {
                throw new ContentPipelineError(`File already exists: ${filePath}`);
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
            if (isContentPipelineError(error)) {
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
     * Delete a file
     */
    async deleteFile(filePath: string): Promise<boolean> {
        try {
            const file = this.vault.getAbstractFileByPath(filePath);
            if (!file || !(file instanceof TFile)) {
                throw new ContentPipelineError(`File not found: ${filePath}`);
            }

            await this.vault.delete(file);
            logger.debug(`File deleted: ${filePath}`);
            return true;

        } catch (error) {
            if (isContentPipelineError(error)) {
                throw error;
            }

            logger.error(`Failed to delete file: ${filePath}`, error);
            return false;
        }
    }
}
