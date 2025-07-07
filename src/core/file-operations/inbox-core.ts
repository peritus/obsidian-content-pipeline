/**
 * Core inbox folder creation logic
 */

import { DirectoryManager } from './directory-manager';
import { FolderStructureResult } from './types';
import { createLogger } from '../../logger';

const logger = createLogger('InboxCore');

export class InboxCore {
    private directoryManager: DirectoryManager;

    constructor(directoryManager: DirectoryManager) {
        this.directoryManager = directoryManager;
    }

    /**
     * Create the complete inbox folder structure with categories
     */
    async createInboxStructure(categories: string[] = ['tasks', 'thoughts', 'uncategorized']): Promise<FolderStructureResult> {
        const result: FolderStructureResult = {
            success: true,
            foldersCreated: 0,
            createdPaths: [],
            errors: []
        };

        try {
            logger.info('Creating inbox folder structure', { categories });

            // Define the base folder structure
            const baseFolders = [
                'inbox/audio',
                'inbox/transcripts',
                'inbox/results',
                'inbox/summary',
                'inbox/templates',
                'inbox/archive/transcribe',
                'inbox/archive/process',
                'inbox/archive/summarize'
            ];

            // Create base folders
            for (const folder of baseFolders) {
                try {
                    await this.directoryManager.ensureDirectory(folder);
                    result.foldersCreated++;
                    result.createdPaths.push(folder);
                    logger.debug(`Created base folder: ${folder}`);
                } catch (error) {
                    const errorMsg = `Failed to create ${folder}: ${error instanceof Error ? error.message : String(error)}`;
                    result.errors.push(errorMsg);
                    logger.warn(errorMsg);
                }
            }

            // Create category subfolders (except for templates which doesn't need them)
            const categorizedFolders = [
                'inbox/audio',
                'inbox/transcripts',
                'inbox/results',
                'inbox/summary',
                'inbox/archive/transcribe',
                'inbox/archive/process',
                'inbox/archive/summarize'
            ];

            for (const baseFolder of categorizedFolders) {
                for (const category of categories) {
                    const categoryPath = `${baseFolder}/${category}`;
                    try {
                        await this.directoryManager.ensureDirectory(categoryPath);
                        result.foldersCreated++;
                        result.createdPaths.push(categoryPath);
                        logger.debug(`Created category folder: ${categoryPath}`);
                    } catch (error) {
                        const errorMsg = `Failed to create ${categoryPath}: ${error instanceof Error ? error.message : String(error)}`;
                        result.errors.push(errorMsg);
                        logger.warn(errorMsg);
                    }
                }
            }

            // If there were errors but some folders were created, mark as partial success
            if (result.errors.length > 0) {
                result.success = result.foldersCreated > 0;
            }

            logger.info(`Inbox structure creation complete: ${result.foldersCreated} folders created, ${result.errors.length} errors`);
            return result;

        } catch (error) {
            const errorMsg = `Failed to create inbox structure: ${error instanceof Error ? error.message : String(error)}`;
            result.errors.push(errorMsg);
            result.success = false;
            logger.error(errorMsg, error);
            return result;
        }
    }
}
