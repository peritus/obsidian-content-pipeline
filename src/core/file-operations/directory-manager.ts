/**
 * Directory management operations
 */

import { App, TFolder, TFile, Vault, normalizePath } from 'obsidian';
import { ContentPipelineError, isContentPipelineError } from '../../errors';
import { createLogger } from '../../logger';

const logger = createLogger('DirectoryManager');

export class DirectoryManager {
    private vault: Vault;

    constructor(app: App) {
        this.vault = app.vault;
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
                throw new ContentPipelineError(`Path exists as file, not directory: ${normalizedPath}`);
            }

            // Create the directory
            const folder = await this.vault.createFolder(normalizedPath);
            logger.debug(`Directory created: ${normalizedPath}`);
            return folder;

        } catch (error) {
            if (isContentPipelineError(error)) {
                throw error; // Re-throw our custom errors
            }

            throw new ContentPipelineError(`Failed to create directory: ${dirPath}`, error instanceof Error ? error : undefined);
        }
    }

    /**
     * Check if a directory exists
     */
    directoryExists(dirPath: string): boolean {
        const dir = this.vault.getAbstractFileByPath(normalizePath(dirPath));
        return dir instanceof TFolder;
    }
}
