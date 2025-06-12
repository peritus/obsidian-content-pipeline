/**
 * File Discovery System
 * 
 * Handles finding the next available file for processing across pipeline entry points.
 */

import { App } from 'obsidian';
import { FileOperations, FileUtils } from '../file-operations';
import { PipelineConfiguration, FileInfo } from '../../types';
import { ErrorFactory } from '../../error-handler';
import { createLogger } from '../../logger';

const logger = createLogger('FileDiscovery');

/**
 * Result of file discovery
 */
export interface FileDiscoveryResult {
    file: FileInfo;
    stepId: string;
}

/**
 * File discovery engine
 */
export class FileDiscovery {
    private fileOps: FileOperations;

    constructor(app: App) {
        this.fileOps = FileUtils.create(app);
        logger.debug('FileDiscovery initialized');
    }

    /**
     * Find the next available file for processing across all entry points
     */
    async findNextAvailableFile(
        config: PipelineConfiguration,
        excludeFiles: Set<string>
    ): Promise<FileDiscoveryResult | null> {
        const entryPoints = this.findEntryPoints(config);
        
        if (entryPoints.length === 0) {
            throw ErrorFactory.pipeline(
                'No entry points found in pipeline configuration',
                'Pipeline has no starting points',
                { configSteps: Object.keys(config) },
                ['Add a step that is not referenced by others', 'Check pipeline configuration']
            );
        }

        logger.debug(`Searching for files in ${entryPoints.length} entry points: ${entryPoints.join(', ')}`);

        for (const stepId of entryPoints) {
            const step = config[stepId];
            
            try {
                const files = await this.fileOps.discoverFiles(step.input, {}, {
                    extensions: ['.mp3', '.wav', '.m4a', '.mp4', '.md', '.txt'],
                    sortBy: 'name',
                    sortOrder: 'asc',
                    limit: 1
                });

                const availableFiles = files.filter(file => 
                    !excludeFiles.has(file.path)
                );

                if (availableFiles.length > 0) {
                    const file = availableFiles[0];
                    logger.debug(`Found file for processing: ${file.path} in step: ${stepId}`);
                    return { file, stepId };
                }
            } catch (error) {
                logger.warn(`Error searching for files in step ${stepId}:`, error);
                continue;
            }
        }

        return null;
    }

    /**
     * Find entry points in the pipeline (steps not referenced by others)
     */
    private findEntryPoints(config: PipelineConfiguration): string[] {
        const allSteps = Object.keys(config);
        const referencedSteps = new Set<string>();

        allSteps.forEach(stepId => {
            const step = config[stepId];
            if (step.next) {
                referencedSteps.add(step.next);
            }
        });

        return allSteps.filter(stepId => !referencedSteps.has(stepId));
    }
}