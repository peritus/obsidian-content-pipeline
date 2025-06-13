/**
 * Directory management operations
 */

import { App, TFolder, TFile, Vault, normalizePath } from 'obsidian';
import { PathUtils } from '../path-resolver';
import { ErrorFactory } from '../../error-handler';
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
     * Check if a directory exists
     */
    directoryExists(dirPath: string): boolean {
        const dir = this.vault.getAbstractFileByPath(normalizePath(dirPath));
        return dir instanceof TFolder;
    }
}
