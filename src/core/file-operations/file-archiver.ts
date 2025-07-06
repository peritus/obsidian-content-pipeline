/**
 * File archiving operations with simplified directory-only system
 */

import { App, TFile, Vault } from 'obsidian';
import { normalizeDirectoryPath } from '../path-operations/normalize-directory-path';
import { extractFilename } from '../path-operations/extract-filename';
import { buildArchivePath } from '../path-operations/build-archive-path';
import { extractDirectoryPath } from '../path-operations/extract-directory-path';
import { FilenameResolver } from '../FilenameResolver';
import { ArchiveResult } from './types';
import { DirectoryManager } from './directory-manager';
import { ContentPipelineError, isContentPipelineError } from '../../errors';
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
     * Move a file to archive location using simplified directory-only system
     */
    async archiveFile(
        sourceFilePath: string,
        archiveDirectory: string
    ): Promise<ArchiveResult> {
        try {
            // Normalize archive directory path (now expects simple directory path)
            const normalizedArchiveDir = normalizeDirectoryPath(archiveDirectory);

            // Get source file
            const sourceFile = this.vault.getAbstractFileByPath(sourceFilePath);
            if (!sourceFile || !(sourceFile instanceof TFile)) {
                throw new ContentPipelineError(`Source file not found: ${sourceFilePath}`);
            }

            // Ensure archive directory exists
            await this.directoryManager.ensureDirectory(normalizedArchiveDir);

            // Extract source filename and build archive path
            const sourceFilename = extractFilename(sourceFilePath);
            const baseArchivePath = buildArchivePath(normalizedArchiveDir, sourceFilename);

            // Generate unique archive filename if needed
            const finalArchivePath = await this.generateUniqueFilename(baseArchivePath);

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
            if (isContentPipelineError(error)) {
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
     * Generate a unique filename to avoid conflicts using simplified path operations
     */
    private async generateUniqueFilename(basePath: string): Promise<string> {
        let counter = 0;
        let testPath = basePath;

        while (this.fileExists(testPath)) {
            counter++;
            const dir = extractDirectoryPath(basePath);
            const filename = extractFilename(basePath);
            const basename = FilenameResolver.getBasename(filename);
            const extension = filename.includes('.') ? '.' + filename.split('.').pop() : '';
            const uniqueName = `${basename}-${counter}${extension}`;
            testPath = dir ? `${dir}${uniqueName}` : uniqueName;
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
