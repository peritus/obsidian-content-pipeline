/**
 * Step-based inbox structure management with Routing-Aware Output Support
 */

import { App } from 'obsidian';
import { DirectoryManager } from './directory-manager';
import { InboxCore } from './inbox-core';
import { EntryPointManager } from './entry-point-manager';
import { FolderStructureResult } from './types';
import { PipelineConfiguration, isRoutingAwareOutput } from '../../types';
import { SimplePathBuilder } from '../SimplePathBuilder';
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
     * Extract output directory paths from step output configuration
     * Handles both string and routing-aware output configurations
     */
    private extractOutputDirectories(stepOutput: string | any): string[] {
        const outputDirs: string[] = [];

        if (typeof stepOutput === 'string') {
            // Handle string output
            let outputDir = stepOutput.replace(/\{[^}]+\}/g, '');
            if (outputDir.includes('.')) {
                // If output includes a filename, get the directory part
                outputDir = outputDir.substring(0, outputDir.lastIndexOf('/'));
            }
            outputDir = outputDir.replace(/\/+$/, '');
            if (outputDir) {
                outputDirs.push(outputDir);
            }
        } else if (isRoutingAwareOutput(stepOutput)) {
            // Handle routing-aware output
            for (const outputPath of Object.values(stepOutput)) {
                if (typeof outputPath === 'string') {
                    let outputDir = outputPath.replace(/\{[^}]+\}/g, '');
                    if (outputDir.includes('.')) {
                        // If output includes a filename, get the directory part
                        outputDir = outputDir.substring(0, outputDir.lastIndexOf('/'));
                    }
                    outputDir = outputDir.replace(/\/+$/, '');
                    if (outputDir && !outputDirs.includes(outputDir)) {
                        outputDirs.push(outputDir);
                    }
                }
            }
        }

        return outputDirs;
    }

    /**
     * Create folders for entry point steps only (minimal setup)
     */
    async createEntryPointFolders(pipelineConfig: PipelineConfiguration): Promise<FolderStructureResult> {
        const result: FolderStructureResult = {
            success: true,
            foldersCreated: 0,
            createdPaths: [],
            errors: []
        };

        try {
            logger.info('Creating entry point folders from pipeline configuration');

            // Find entry point steps (steps not referenced by other steps via routing-aware output)
            const allStepIds = Object.keys(pipelineConfig);
            const referencedSteps = new Set<string>();
            
            for (const step of Object.values(pipelineConfig)) {
                // Check routing-aware output for referenced next steps
                if (step.routingAwareOutput && isRoutingAwareOutput(step.routingAwareOutput)) {
                    Object.keys(step.routingAwareOutput).forEach(nextStepId => {
                        // Skip 'default' key as it's not a step reference
                        if (nextStepId !== 'default') {
                            referencedSteps.add(nextStepId);
                        }
                    });
                }
            }

            const entryPointSteps = allStepIds.filter(stepId => !referencedSteps.has(stepId));

            // Create input directories for entry point steps
            for (const stepId of entryPointSteps) {
                const step = pipelineConfig[stepId];
                try {
                    // Resolve the input directory (without variables)
                    const inputDir = step.input.replace(/\{[^}]+\}/g, '').replace(/\/+$/, '');
                    
                    await this.directoryManager.ensureDirectory(inputDir);
                    result.foldersCreated++;
                    result.createdPaths.push(inputDir);
                    logger.debug(`Created entry point folder: ${inputDir}`);
                } catch (error) {
                    const errorMsg = `Failed to create entry point folder for step ${stepId}: ${error instanceof Error ? error.message : String(error)}`;
                    result.errors.push(errorMsg);
                    logger.warn(errorMsg);
                }
            }

            result.success = result.errors.length === 0;
            logger.info(`Entry point folder creation complete: ${result.foldersCreated} folders created, ${result.errors.length} errors`);
            return result;

        } catch (error) {
            const errorMsg = `Failed to create entry point folders: ${error instanceof Error ? error.message : String(error)}`;
            result.errors.push(errorMsg);
            result.success = false;
            logger.error(errorMsg, error);
            return result;
        }
    }

    /**
     * Create the complete inbox folder structure for all steps
     */
    async createCompleteStructure(pipelineConfig: PipelineConfiguration): Promise<FolderStructureResult> {
        const result: FolderStructureResult = {
            success: true,
            foldersCreated: 0,
            createdPaths: [],
            errors: []
        };

        try {
            logger.info('Creating complete folder structure from pipeline configuration');

            // Create all input and output directories for all steps
            for (const [stepId, step] of Object.entries(pipelineConfig)) {
                try {
                    // Create input directory (remove variables for base path)
                    const inputDir = step.input.replace(/\{[^}]+\}/g, '').replace(/\/+$/, '');
                    if (inputDir && !result.createdPaths.includes(inputDir)) {
                        await this.directoryManager.ensureDirectory(inputDir);
                        result.foldersCreated++;
                        result.createdPaths.push(inputDir);
                        logger.debug(`Created input folder: ${inputDir}`);
                    }

                    // Create output directories (handle routing-aware outputs)
                    const outputDirs = this.extractOutputDirectories(step.output);
                    for (const outputDir of outputDirs) {
                        if (outputDir && !result.createdPaths.includes(outputDir)) {
                            await this.directoryManager.ensureDirectory(outputDir);
                            result.foldersCreated++;
                            result.createdPaths.push(outputDir);
                            logger.debug(`Created output folder: ${outputDir}`);
                        }
                    }

                    // Create archive directory (step-based pattern: inbox/archive/{stepId})
                    const archiveDir = `inbox/archive/${stepId}`;
                    if (!result.createdPaths.includes(archiveDir)) {
                        await this.directoryManager.ensureDirectory(archiveDir);
                        result.foldersCreated++;
                        result.createdPaths.push(archiveDir);
                        logger.debug(`Created archive folder: ${archiveDir}`);
                    }

                } catch (error) {
                    const errorMsg = `Failed to create folders for step ${stepId}: ${error instanceof Error ? error.message : String(error)}`;
                    result.errors.push(errorMsg);
                    logger.warn(errorMsg);
                }
            }

            result.success = result.errors.length === 0;
            logger.info(`Complete structure creation complete: ${result.foldersCreated} folders created, ${result.errors.length} errors`);
            return result;

        } catch (error) {
            const errorMsg = `Failed to create complete structure: ${error instanceof Error ? error.message : String(error)}`;
            result.errors.push(errorMsg);
            result.success = false;
            logger.error(errorMsg, error);
            return result;
        }
    }

    /**
     * Check if the basic inbox structure exists
     */
    checkInboxStructure(): { exists: boolean; missingFolders: string[] } {
        const requiredFolders = [
            'inbox',
            'inbox/audio',
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

    /**
     * Create folders on-demand for a specific step's processing
     */
    async createStepFolders(stepId: string, step: any): Promise<FolderStructureResult> {
        const result: FolderStructureResult = {
            success: true,
            foldersCreated: 0,
            createdPaths: [],
            errors: []
        };

        try {
            // Create output directories for this step (handle routing-aware outputs)
            const outputDirs = this.extractOutputDirectories(step.output);
            for (const outputDir of outputDirs) {
                if (outputDir) {
                    await this.directoryManager.ensureDirectory(outputDir);
                    result.foldersCreated++;
                    result.createdPaths.push(outputDir);
                    logger.debug(`Created output folder for step ${stepId}: ${outputDir}`);
                }
            }

            // Create archive directory for this step
            const archiveDir = `inbox/archive/${stepId}`;
            await this.directoryManager.ensureDirectory(archiveDir);
            result.foldersCreated++;
            result.createdPaths.push(archiveDir);
            logger.debug(`Created archive folder for step ${stepId}: ${archiveDir}`);

            result.success = true;
            return result;

        } catch (error) {
            const errorMsg = `Failed to create folders for step ${stepId}: ${error instanceof Error ? error.message : String(error)}`;
            result.errors.push(errorMsg);
            result.success = false;
            return result;
        }
    }
}