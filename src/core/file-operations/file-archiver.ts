/**
 * File archiving operations
 */

import { App, TFile, Vault } from 'obsidian';
import { PathResolver, PathUtils } from '../path-resolver';
import { PathContext } from '../../types';
import { ArchiveResult } from './types';
import { DirectoryManager } from './directory-manager';
import { ErrorFactory } from '../../error-handler';
import { createLogger } from '../../logger';

const logger = createLogger('FileArchiver');

export class FileArchiver {
    private vault: Vault;
    private directoryManager: DirectoryManager;

    constructor(app: App) {
        this.vault = app.vault;
        this.directoryManager = new DirectoryManager(app);
    }

    /**
     * Move a file to archive location
     */
    async archiveFile(
        sourceFilePath: string,
        archivePattern: string,
        context: PathContext
    ): Promise<ArchiveResult> {
        try {
            // Resolve the archive path
            const archiveResult = PathResolver.resolvePath(archivePattern, context);
            if (!archiveResult.isComplete) {
                throw ErrorFactory.fileSystem(
                    `Cannot resolve archive path: missing variables ${archiveResult.missingVariables.join(', ')}`,
                    'Cannot determine archive location',
                    { archivePattern, context, missingVariables: archiveResult.missingVariables },
                    ['Provide all required variables for archive path', 'Check archive pattern configuration']
                );
            }

            const archivePath = archiveResult.resolvedPath;

            // Get source file
            const sourceFile = this.vault.getAbstractFileByPath(sourceFilePath);
            if (!sourceFile || !(sourceFile instanceof TFile)) {
                throw ErrorFactory.fileSystem(
                    `Source file not found: ${sourceFilePath}`,
                    `Cannot archive file: source file not found`,
                    { sourceFilePath },
                    ['Check if source file exists', 'Verify file path']
                );
            }

            // Ensure archive directory exists
            const archiveDir = PathUtils.getDirectory(archivePath);
            if (archiveDir) {
                await this.directoryManager.ensureDirectory(archiveDir);
            }

            // Generate unique archive filename if needed
            const finalArchivePath = await this.generateUniqueFilename(archivePath);

            // Move the file
            await this.vault.rename(sourceFile, finalArchivePath);

            // Get the archived file
            const archivedFile = this.vault.getAbstractFileByPath(finalArchivePath) as TFile;

            logger.info(`File archived: ${sourceFilePath} → ${finalArchivePath}`);

            return {
                success: true,
                originalPath: sourceFilePath,
                archivePath: finalArchivePath,
                archivedFile
            };

        } catch (error) {
            if (error instanceof Error && error.name === 'AudioInboxError') {
                throw error; // Re-throw our custom errors
            }

            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error(`Failed to archive file: ${sourceFilePath}`, { error: errorMessage });

            return {
                success: false,
                originalPath: sourceFilePath,
                archivePath: '',
                error: errorMessage
            };
        }
    }

    /**
     * Generate a unique filename to avoid conflicts
     */
    private async generateUniqueFilename(basePath: string): Promise<string> {
        let counter = 0;
        let testPath = basePath;

        while (this.fileExists(testPath)) {
            counter++;
            const dir = PathUtils.getDirectory(basePath);
            const basename = PathUtils.getBasename(basePath);
            const extension = PathUtils.getExtension(basePath);
            const uniqueName = `${basename}-${counter}${extension}`;
            testPath = dir ? PathUtils.join(dir, uniqueName) : uniqueName;
        }

        return testPath;
    }

    /**
     * Check if a file exists
     */
    private fileExists(filePath: string): boolean {
        const file = this.vault.getAbstractFileByPath(filePath);
        return file instanceof TFile;
    }
}
