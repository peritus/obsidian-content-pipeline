import { Notice } from 'obsidian';
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
    private foldersContainer?: HTMLElement;

    constructor(plugin: ContentPipelinePlugin, fileOps: FileOperations) {
        this.plugin = plugin;
        this.fileOps = fileOps;
        this.directoryManager = new DirectoryManager(plugin.app);
    }

    /**
     * Render the folder setup section
     * Creates a container that will be populated with missing entry point folders
     */
    render(containerEl: HTMLElement): void {
        try {
            const pipelineConfig = this.plugin.settings.parsedPipelineConfig;
            if (!pipelineConfig) {
                return; // No configuration, nothing to render
            }

            // Create a container immediately to reserve the position
            this.foldersContainer = containerEl.createEl('div', { cls: 'content-pipeline-folders-container' });
            
            // Populate the container with missing folders
            this.updateFoldersStatus();

        } catch (error) {
            console.error('Error in FolderSetupSection render:', error);
            // Create a container for error display
            this.foldersContainer = containerEl.createEl('div', { cls: 'content-pipeline-folders-container' });
            this.showError(this.foldersContainer, `Failed to load folder setup: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Update the folders status display in the container
     */
    private updateFoldersStatus(): void {
        if (!this.foldersContainer) return;

        try {
            const pipelineConfig = this.plugin.settings.parsedPipelineConfig;
            if (!pipelineConfig) return;

            const entryPointsStatus = this.checkEntryPointFolders(pipelineConfig);
            const missingFolders = entryPointsStatus.filter(status => !status.exists);

            // Clear the container
            this.foldersContainer.empty();

            // Only show the section if there are missing folders
            if (missingFolders.length > 0) {
                // Create the heading
                this.foldersContainer.createEl('h3', { text: 'Entry Point Folders' });
                
                // Create a content section within the container
                const contentSection = this.foldersContainer.createEl('div');

                // Show info about entry point folders
                const infoEl = contentSection.createEl('p', { cls: 'content-pipeline-folders-info' });
                infoEl.textContent = `Create input folders for pipeline entry points where you'll place files to start processing.`;

                // Render missing folders
                this.renderMissingFolders(contentSection, missingFolders);
            } else {
                // If no folders to show, hide the container completely
                this.foldersContainer.addClass('content-pipeline-folders-hidden');
            }

        } catch (error) {
            // If there's an error checking status, show error in the container
            this.foldersContainer.empty();
            this.foldersContainer.createEl('h3', { text: 'Entry Point Folders' });
            this.handleError(this.foldersContainer, error);
        }
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
     * Render missing folders section
     */
    private renderMissingFolders(contentEl: HTMLElement, missingFolders: EntryPointFolderStatus[]): void {
        for (const folderStatus of missingFolders) {
            this.renderIndividualFolder(contentEl, folderStatus);
        }
    }

    /**
     * Render a single folder entry with horizontal layout
     */
    private renderIndividualFolder(containerEl: HTMLElement, folderStatus: EntryPointFolderStatus): void {
        const folderEl = containerEl.createEl('div', { cls: 'content-pipeline-folder-item' });

        // Top row: folder path and button
        const topRow = folderEl.createEl('div', { cls: 'content-pipeline-folder-top-row' });

        // Left side: folder path
        const pathEl = topRow.createEl('div', { cls: 'content-pipeline-folder-path' });
        pathEl.textContent = folderStatus.inputPath;

        // Right side: button
        const createBtn = topRow.createEl('button', { 
            text: 'Create folder',
            cls: 'content-pipeline-folder-create-button'
        });
        createBtn.onclick = () => this.createSingleFolder(folderStatus);

        // Bottom row: step info
        const finePrintEl = folderEl.createEl('small', { cls: 'content-pipeline-folder-fine-print' });
        finePrintEl.textContent = `Entry point for: ${folderStatus.stepId}`;
    }

    /**
     * Create a single folder
     */
    private async createSingleFolder(folderStatus: EntryPointFolderStatus): Promise<void> {
        try {
            // Create the folder
            await this.directoryManager.ensureDirectory(folderStatus.inputPath);
            
            // Show success notice
            new Notice(`✅ Created folder: ${folderStatus.inputPath}`, 3000);
            
            // Update the display to remove this folder from the list
            this.updateFoldersStatus();

        } catch (error) {
            const errorMsg = `Failed to create folder ${folderStatus.inputPath}: ${error instanceof Error ? error.message : String(error)}`;
            new Notice(`❌ ${errorMsg}`, 5000);
            console.error(errorMsg, error);
        }
    }

    /**
     * Show simple error message
     */
    private showError(containerEl: HTMLElement, message: string): void {
        const errorEl = containerEl.createEl('div', { cls: 'content-pipeline-simple-error' });
        errorEl.innerHTML = `❌ <strong>Error:</strong> ${message}`;
    }

    /**
     * Handle errors in status checking
     */
    private handleError(containerEl: HTMLElement, error: unknown): void {
        const errorEl = containerEl.createEl('div', { cls: 'content-pipeline-overall-error' });
        errorEl.innerHTML = `
            <div class="content-pipeline-overall-error-icon">⚠️</div>
            <div class="content-pipeline-overall-error-title">Error Checking Folders</div>
            <div class="content-pipeline-overall-error-details">${error instanceof Error ? error.message : String(error)}</div>
        `;
        
        console.error('Error in updateFoldersStatus:', error);
    }
}
