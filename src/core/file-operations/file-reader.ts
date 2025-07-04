/**
 * File reading operations
 */

import { App, TFile, Vault, normalizePath } from 'obsidian';
import { FileOperationOptions } from './types';
import { ContentPipelineError, isContentPipelineError } from '../../errors';
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
                throw new ContentPipelineError(`File not found: ${filePath}`);
            }

            if (!(file instanceof TFile)) {
                throw new ContentPipelineError(`Path is not a file: ${filePath}`);
            }

            // Read the file content
            const content = await this.vault.read(file);
            
            logger.debug(`File read successfully: ${filePath} (${content.length} chars)`);
            return content;

        } catch (error) {
            if (isContentPipelineError(error)) {
                throw error; // Re-throw our custom errors
            }

            throw new ContentPipelineError(`Failed to read file: ${filePath}`, error instanceof Error ? error : undefined);
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
