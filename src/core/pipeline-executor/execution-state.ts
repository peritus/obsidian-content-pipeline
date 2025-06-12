/**
 * Execution State Management
 * 
 * Manages the state of pipeline execution including active files and processing status.
 */

import { createLogger } from '../../logger';

const logger = createLogger('ExecutionState');

/**
 * Pipeline execution state manager
 */
export class ExecutionState {
    private processing: boolean = false;
    private activeFiles: Set<string> = new Set();
    private lastExecution?: Date;

    /**
     * Start processing and update state
     */
    startProcessing(): void {
        this.processing = true;
        this.lastExecution = new Date();
        logger.debug('Execution started');
    }

    /**
     * End processing and clear state
     */
    endProcessing(): void {
        this.processing = false;
        this.activeFiles.clear();
        logger.debug('Execution ended');
    }

    /**
     * Check if currently processing
     */
    isProcessing(): boolean {
        return this.processing;
    }

    /**
     * Add a file to active processing set
     */
    addActiveFile(filePath: string): void {
        this.activeFiles.add(filePath);
        logger.debug(`File added to active set: ${filePath}`);
    }

    /**
     * Remove a file from active processing set
     */
    removeActiveFile(filePath: string): void {
        this.activeFiles.delete(filePath);
        logger.debug(`File removed from active set: ${filePath}`);
    }

    /**
     * Get active files as array
     */
    getActiveFiles(): string[] {
        return Array.from(this.activeFiles);
    }

    /**
     * Get active files as Set for efficient lookup
     */
    getActiveFilesSet(): Set<string> {
        return new Set(this.activeFiles);
    }

    /**
     * Get complete status
     */
    getStatus() {
        return {
            isProcessing: this.processing,
            activeFileCount: this.activeFiles.size,
            lastExecution: this.lastExecution
        };
    }

    /**
     * Clear all state
     */
    reset(): void {
        this.processing = false;
        this.activeFiles.clear();
        this.lastExecution = undefined;
        logger.debug('Execution state reset');
    }
}