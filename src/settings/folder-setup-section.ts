import { Notice, Setting } from 'obsidian';
import ContentPipelinePlugin from '../main';
import { FileOperations } from '../core/file-operations';
import { DirectoryManager } from '../core/file-operations/directory-manager';
import { PipelineConfiguration } from '../types';

interface EntryPointFolderStatus {
    stepId: string;
    inputPath: string;
    exists: boolean;
}

/**
 * Manages the folder setup section with individual entry point folder creation
 * Inspired by ExamplePromptsManager functionality and styling
 */
export class FolderSetupSection {
    private plugin: ContentPipelinePlugin;
    private fileOps: FileOperations;
    private directoryManager: DirectoryManager;

    constructor(plugin: ContentPipelinePlugin, fileOps: FileOperations) {
        this.plugin = plugin;
        this.fileOps = fileOps;
        this.directoryManager = new DirectoryManager(plugin.app);
    }

    /**
     * Render the folder setup section
     * Only renders if there are missing folders to avoid empty sections
     */
    render(containerEl: HTMLElement): void {
        try {
            const pipelineConfig = this.plugin.settings.parsedPipelineConfig;
            if (!pipelineConfig) {
                return; // No configuration, nothing to render
            }

            const entryPointsStatus = this.checkEntryPointFolders(pipelineConfig);
            const missingFolders = entryPointsStatus.filter(status => !status.exists);

            // Only render if there are missing folders
            if (missingFolders.length > 0) {
                // Create proper Obsidian heading
                new Setting(containerEl).setName('Entry Point Folders').setHeading();
                
                // Add description using Setting
                new Setting(containerEl)
                    .setName('')
                    .setDesc('Create input folders for pipeline entry points where you\'ll place files to start processing.');

                // Render missing folders
                this.renderMissingFolders(containerEl, missingFolders);
            }

        } catch (error) {
            console.error('Error in FolderSetupSection render:', error);
            
            // Show error using proper Setting structure
            new Setting(containerEl).setName('Entry Point Folders').setHeading();
            new Setting(containerEl)
                .setName('Error')
                .setDesc(`Failed to load folder setup: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Render missing folders section
     */
    private renderMissingFolders(containerEl: HTMLElement, missingFolders: EntryPointFolderStatus[]): void {
        for (const folderStatus of missingFolders) {
            this.renderIndividualFolder(containerEl, folderStatus);
        }
    }

    /**
     * Render a single folder entry using Obsidian Setting structure
     */
    private renderIndividualFolder(containerEl: HTMLElement, folderStatus: EntryPointFolderStatus): void {
        // Format path for display
        let displayPath = folderStatus.inputPath.startsWith('/') ? folderStatus.inputPath : `/${folderStatus.inputPath}`;
        displayPath = displayPath.endsWith('/') ? displayPath : `${displayPath}/`;

        new Setting(containerEl)
            .setName(`Folder: ${displayPath}`)
            .setDesc(`Entry point for: ${folderStatus.stepId}`)
            .addButton(button => {
                button
                    .setButtonText('Create folder')
                    .onClick(() => this.createSingleFolder(folderStatus));
            });
    }

    /**
     * Check status of entry point folders
     */
    private checkEntryPointFolders(pipelineConfig: PipelineConfiguration): EntryPointFolderStatus[] {
        const allStepIds = Object.keys(pipelineConfig);
        const referencedSteps = new Set<string>();
        
        // Find steps referenced by routing-aware output
        for (const step of Object.values(pipelineConfig)) {
            if (step.routingAwareOutput && typeof step.routingAwareOutput === 'object') {
                Object.keys(step.routingAwareOutput).forEach(nextStepId => {
                    // Skip 'default' key as it's not a step reference
                    if (nextStepId !== 'default') {
                        referencedSteps.add(nextStepId);
                    }
                });
            }
        }

        // Entry points are steps not referenced by others
        const entryPointSteps = allStepIds.filter(stepId => !referencedSteps.has(stepId));

        return entryPointSteps.map(stepId => {
            const step = pipelineConfig[stepId];
            // Remove variables and trailing slashes to get the base input path
            const inputPath = step.input.replace(/\{[^}]+\}/g, '').replace(/\/+$/, '');
            const exists = this.directoryManager.directoryExists(inputPath);

            return {
                stepId,
                inputPath,
                exists
            };
        });
    }

    /**
     * Create a single folder
     */
    private async createSingleFolder(folderStatus: EntryPointFolderStatus): Promise<void> {
        try {
            // Create the folder
            await this.directoryManager.ensureDirectory(folderStatus.inputPath);
            
            // Show success notice with instruction to refresh
            new Notice(`✅ Created folder: ${folderStatus.inputPath}. Reload settings to update the list.`, 5000);

        } catch (error) {
            const errorMsg = `Failed to create folder ${folderStatus.inputPath}: ${error instanceof Error ? error.message : String(error)}`;
            new Notice(`❌ ${errorMsg}`, 5000);
            console.error(errorMsg, error);
        }
    }
}
