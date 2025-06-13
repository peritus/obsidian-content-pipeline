/**
 * File operations module exports
 */

export { FileOperations } from './file-operations';
export { DirectoryManager } from './directory-manager';
export { InboxStructureManager } from './inbox-structure';
export { FileReader } from './file-reader';
export { FileWriter } from './file-writer';
export { FileArchiver } from './file-archiver';
export { FileDiscovery } from './file-discovery';
export { FileInfoProvider } from './file-info-provider';
export { FileUtils } from './file-utils';

export type {
    FileOperationOptions,
    FileOperationResult,
    FileDiscoveryOptions,
    ArchiveResult,
    FolderStructureResult
} from './types';

// Default export for backwards compatibility
export { FileOperations as default } from './file-operations';
