/**
 * Main file operations orchestrator
 */

import { App, TFolder } from 'obsidian';
import { PathResolver } from '../path-resolver';
import { PathContext, FileInfo } from '../../types';
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
    async createInboxStructure(categories?: string[]): Promise<FolderStructureResult> {
        return this.inboxStructureManager.createInboxStructure(categories);
    }

    async createCategoryFolders(category: string): Promise<FolderStructureResult> {
        return this.inboxStructureManager.createCategoryFolders(category);
    }

    async createEntryPointFolders(categories?: string[]): Promise<FolderStructureResult> {
        return this.inboxStructureManager.createEntryPointFolders(categories);
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
    async ensureDirectoryForPattern(
        pathPattern: string, 
        context: PathContext
    ): Promise<TFolder> {
        // Resolve the path pattern
        const pathResult = PathResolver.resolvePath(pathPattern, context);
        
        if (!pathResult.isComplete) {
            throw ErrorFactory.fileSystem(
                `Cannot resolve path pattern: missing variables ${pathResult.missingVariables.join(', ')}`,
                'Cannot create directory for incomplete path',
                { pathPattern, context, missingVariables: pathResult.missingVariables },
                ['Provide all required variables', 'Check path pattern configuration']
            );
        }

        const resolvedPath = pathResult.resolvedPath;
        
        // If it's a file path, get the directory part
        const directoryPath = resolvedPath.endsWith('/') || !resolvedPath.includes('.') 
            ? resolvedPath 
            : resolvedPath.substring(0, resolvedPath.lastIndexOf('/'));

        if (!directoryPath) {
            throw ErrorFactory.fileSystem(
                'Cannot determine directory from path pattern',
                'Path pattern does not resolve to a valid directory',
                { pathPattern, resolvedPath },
                ['Check path pattern format', 'Ensure pattern includes directory structure']
            );
        }

        return await this.directoryManager.ensureDirectory(directoryPath);
    }

    directoryExists(dirPath: string): boolean {
        return this.directoryManager.directoryExists(dirPath);
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
    async archiveFile(sourceFilePath: string, archivePattern: string, context: PathContext): Promise<ArchiveResult> {
        return this.fileArchiver.archiveFile(sourceFilePath, archivePattern, context);
    }

    // Discovery operations
    async discoverFiles(inputPattern: string, context?: Partial<PathContext>, options?: FileDiscoveryOptions): Promise<FileInfo[]> {
        return this.fileDiscovery.discoverFiles(inputPattern, context, options);
    }

    getFileInfo(file: any): FileInfo {
        return this.fileDiscovery.getFileInfo(file);
    }
}
