/**
 * Category-specific inbox structure management
 */

import { App } from 'obsidian';
import { DirectoryManager } from './directory-manager';
import { InboxCore } from './inbox-core';
import { EntryPointManager } from './entry-point-manager';
import { FolderStructureResult } from './types';
import { createLogger } from '../../logger';

const logger = createLogger('InboxStructure');

export class InboxStructureManager {
    private directoryManager: DirectoryManager;
    private inboxCore: InboxCore;
    private entryPointManager: EntryPointManager;

    constructor(app: App) {
        this.directoryManager = new DirectoryManager(app);
        this.inboxCore = new InboxCore(this.directoryManager);
        this.entryPointManager = new EntryPointManager(this.directoryManager);
    }

    /**
     * Create the complete inbox folder structure with categories
     */
    async createInboxStructure(categories: string[] = ['tasks', 'thoughts', 'uncategorized']): Promise<FolderStructureResult> {
        return this.inboxCore.createInboxStructure(categories);
    }

    /**
     * Create folders for entry point steps only (minimal setup)
     */
    async createEntryPointFolders(categories: string[] = ['tasks', 'thoughts', 'uncategorized']): Promise<FolderStructureResult> {
        return this.entryPointManager.createEntryPointFolders(categories);
    }

    /**
     * Create folders for a specific category across all pipeline stages
     */
    async createCategoryFolders(category: string): Promise<FolderStructureResult> {
        const result: FolderStructureResult = {
            success: true,
            foldersCreated: 0,
            createdPaths: [],
            errors: []
        };

        try {
            logger.info(`Creating category folders for: ${category}`);

            // Define category folder paths
            const categoryFolders = [
                `inbox/audio/${category}`,
                `inbox/transcripts/${category}`,
                `inbox/results/${category}`,
                `inbox/summary/${category}`,
                `inbox/archive/transcribe/${category}`,
                `inbox/archive/process/${category}`,
                `inbox/archive/summarize/${category}`
            ];

            // Create each category folder
            for (const folder of categoryFolders) {
                try {
                    await this.directoryManager.ensureDirectory(folder);
                    result.foldersCreated++;
                    result.createdPaths.push(folder);
                    logger.debug(`Created category folder: ${folder}`);
                } catch (error) {
                    const errorMsg = `Failed to create ${folder}: ${error instanceof Error ? error.message : String(error)}`;
                    result.errors.push(errorMsg);
                    logger.warn(errorMsg);
                }
            }

            result.success = result.errors.length === 0;
            logger.info(`Category folder creation complete: ${result.foldersCreated} folders created, ${result.errors.length} errors`);
            return result;

        } catch (error) {
            const errorMsg = `Failed to create category folders: ${error instanceof Error ? error.message : String(error)}`;
            result.errors.push(errorMsg);
            result.success = false;
            logger.error(errorMsg, error);
            return result;
        }
    }

    /**
     * Check if the inbox structure exists
     */
    checkInboxStructure(): { exists: boolean; missingFolders: string[] } {
        const requiredFolders = [
            'inbox',
            'inbox/audio',
            'inbox/transcripts',
            'inbox/results',
            'inbox/summary',
            'inbox/templates',
            'inbox/archive'
        ];

        const missingFolders: string[] = [];

        for (const folder of requiredFolders) {
            if (!this.directoryManager.directoryExists(folder)) {
                missingFolders.push(folder);
            }
        }

        return {
            exists: missingFolders.length === 0,
            missingFolders
        };
    }
}
