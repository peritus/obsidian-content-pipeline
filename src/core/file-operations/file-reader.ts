/**
 * File reading operations
 */

import { App, TFile, Vault, normalizePath } from 'obsidian';
import { FileOperationOptions } from './types';
import { ErrorFactory } from '../../error-handler';
import { createLogger } from '../../logger';

const logger = createLogger('FileReader');

export class FileReader {
    private vault: Vault;

    constructor(app: App) {
        this.vault = app.vault;
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
            if (error instanceof Error && error.name === 'ContentPipelineError') {
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
     * Check if a file exists
     */
    fileExists(filePath: string): boolean {
        const file = this.vault.getAbstractFileByPath(normalizePath(filePath));
        return file instanceof TFile;
    }
}
