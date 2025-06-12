/**
 * File Archiving Logic
 */

import { App } from 'obsidian';
import { FileOperations, FileUtils } from '../../file-operations';
import { 
    PipelineStep,
    FileInfo
} from '../../../types';
import { createLogger } from '../../../logger';

const logger = createLogger('ArchiveHandler');

export class ArchiveHandler {
    private app: App;
    private fileOps: FileOperations;

    constructor(app: App) {
        this.app = app;
        this.fileOps = new FileOperations(app);
    }

    async archive(
        fileInfo: FileInfo,
        step: PipelineStep,
        stepId: string
    ): Promise<string> {
        try {
            const pathContext = FileUtils.createProcessingContext(fileInfo, stepId);
            const archiveResult = await this.fileOps.archiveFile(
                fileInfo.path, 
                step.archive, 
                pathContext
            );
            
            logger.debug(`File archived: ${fileInfo.path} → ${archiveResult.archivePath}`);
            return archiveResult.archivePath;

        } catch (error) {
            logger.warn(`Failed to archive file: ${fileInfo.path}`, error);
            return fileInfo.path; // Return original path if archiving fails
        }
    }
}
