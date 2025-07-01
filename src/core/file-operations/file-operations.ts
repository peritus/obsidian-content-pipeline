/**
 * Main file operations orchestrator
 */

import { App, TFolder } from 'obsidian';
import { SimplePathBuilder } from '../SimplePathBuilder';
import { FileInfo, PipelineConfiguration } from '../../types';
import { 
    FileOperationOptions, 
    FileOperationResult, 
    FileDiscoveryOptions, 
    ArchiveResult, 
    FolderStructureResult 
} from './types';
import { DirectoryManager } from './directory-manager';
import { InboxStructureManager } from './inbox-structure';
import { FileReader } from './file-reader';
import { FileWriter } from './file-writer';
import { FileArchiver } from './file-archiver';
import { FileDiscovery } from './file-discovery';
import { ErrorFactory } from '../../error-handler';
import { createLogger } from '../../logger';

const logger = createLogger('FileOperations');

/**
 * File operations class for vault-aware file management
 */
export class FileOperations {
    private app: App;
    private directoryManager: DirectoryManager;
    private inboxStructureManager: InboxStructureManager;
    private fileReader: FileReader;
    private fileWriter: FileWriter;
    private fileArchiver: FileArchiver;
    private fileDiscovery: FileDiscovery;

    constructor(app: App) {
        this.app = app;
        this.directoryManager = new DirectoryManager(app);
        this.inboxStructureManager = new InboxStructureManager(app);
        this.fileReader = new FileReader(app);
        this.fileWriter = new FileWriter(app);
        this.fileArchiver = new FileArchiver(app);
        this.fileDiscovery = new FileDiscovery(app);
        logger.debug('FileOperations initialized');
    }

    // Inbox structure operations
    async createCompleteStructure(pipelineConfig: PipelineConfiguration): Promise<FolderStructureResult> {
        return this.inboxStructureManager.createCompleteStructure(pipelineConfig);
    }

    async createStepFolders(stepId: string, step: any): Promise<FolderStructureResult> {
        return this.inboxStructureManager.createStepFolders(stepId, step);
    }

    async createEntryPointFolders(pipelineConfig: PipelineConfiguration): Promise<FolderStructureResult> {
        return this.inboxStructureManager.createEntryPointFolders(pipelineConfig);
    }

    checkInboxStructure(): { exists: boolean; missingFolders: string[] } {
        return this.inboxStructureManager.checkInboxStructure();
    }

    // Directory operations
    async ensureDirectory(dirPath: string): Promise<TFolder> {
        return this.directoryManager.ensureDirectory(dirPath);
    }

    /**
     * Ensure directory for a resolved path pattern
     */
    async ensureDirectoryForPattern(pathPattern: string): Promise<TFolder> {
        // Use SimplePathBuilder to resolve the directory path
        const directoryPath = SimplePathBuilder.resolveInputDirectory(pathPattern);
        
        if (!directoryPath) {
            throw ErrorFactory.fileSystem(
                'Cannot determine directory from path pattern',
                'Path pattern does not resolve to a valid directory',
                { pathPattern },
                ['Check path pattern format', 'Ensure pattern includes directory structure']
            );
        }

        return await this.directoryManager.ensureDirectory(directoryPath);
    }

    directoryExists(dirPath: string): boolean {
        return this.directoryManager.directoryExists(dirPath);
    }

    /**
     * Ensure directory exists for a file path
     */
    async ensureDirectoryForFile(filePath: string): Promise<void> {
        const lastSlash = filePath.lastIndexOf('/');
        if (lastSlash > 0) {
            const directoryPath = filePath.substring(0, lastSlash);
            await this.ensureDirectory(directoryPath);
            logger.debug(`Ensured directory exists for file: ${directoryPath}`);
        }
    }

    // File operations
    async readFile(filePath: string, options?: FileOperationOptions): Promise<string> {
        return this.fileReader.readFile(filePath, options);
    }

    async writeFile(filePath: string, content: string, options?: FileOperationOptions): Promise<FileOperationResult> {
        return this.fileWriter.writeFile(filePath, content, options);
    }

    async deleteFile(filePath: string): Promise<boolean> {
        return this.fileWriter.deleteFile(filePath);
    }

    fileExists(filePath: string): boolean {
        return this.fileReader.fileExists(filePath);
    }

    // Archive operations  
    async archiveFile(sourceFilePath: string, archiveDirectory: string): Promise<ArchiveResult> {
        return this.fileArchiver.archiveFile(sourceFilePath, archiveDirectory);
    }

    // Discovery operations
    async discoverFiles(inputPattern: string, context?: Record<string, any>, options?: FileDiscoveryOptions): Promise<FileInfo[]> {
        return this.fileDiscovery.discoverFiles(inputPattern, context, options);
    }

    getFileInfo(file: any): FileInfo {
        return this.fileDiscovery.getFileInfo(file);
    }
}
