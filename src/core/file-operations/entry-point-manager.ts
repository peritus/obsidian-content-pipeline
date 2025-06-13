/**
 * Entry point folder management
 */

import { DirectoryManager } from './directory-manager';
import { FolderStructureResult } from './types';
import { createLogger } from '../../logger';

const logger = createLogger('EntryPointFolders');

export class EntryPointManager {
    private directoryManager: DirectoryManager;

    constructor(directoryManager: DirectoryManager) {
        this.directoryManager = directoryManager;
    }

    /**
     * Create folders for entry point steps only (minimal setup)
     */
    async createEntryPointFolders(categories: string[] = ['tasks', 'thoughts', 'uncategorized']): Promise<FolderStructureResult> {
        const result: FolderStructureResult = {
            success: true,
            foldersCreated: 0,
            createdPaths: [],
            errors: []
        };

        try {
            logger.info('Creating entry point folders', { categories });

            // Create the main inbox directory first
            await this.directoryManager.ensureDirectory('inbox');
            result.foldersCreated++;
            result.createdPaths.push('inbox');

            // Create audio folders for each category (entry point for audio pipeline)
            for (const category of categories) {
                const audioFolder = `inbox/audio/${category}`;
                try {
                    await this.directoryManager.ensureDirectory(audioFolder);
                    result.foldersCreated++;
                    result.createdPaths.push(audioFolder);
                    logger.debug(`Created entry point folder: ${audioFolder}`);
                } catch (error) {
                    const errorMsg = `Failed to create ${audioFolder}: ${error instanceof Error ? error.message : String(error)}`;
                    result.errors.push(errorMsg);
                    logger.warn(errorMsg);
                }
            }

            result.success = result.errors.length === 0;
            logger.info(`Entry point folder creation complete: ${result.foldersCreated} folders created, ${result.errors.length} errors`);
            return result;

        } catch (error) {
            const errorMsg = `Failed to create entry point folders: ${error instanceof Error ? error.message : String(error)}`;
            result.errors.push(errorMsg);
            result.success = false;
            logger.error(errorMsg, error);
            return result;
        }
    }
}
