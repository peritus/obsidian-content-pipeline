import { Setting, Notice } from 'obsidian';
import AudioInboxPlugin from '../main';
import { FileOperations } from '../core/file-operations';

/**
 * Folder setup section for settings
 */
export class FolderSetupSection {
    private plugin: AudioInboxPlugin;
    private fileOps: FileOperations;

    constructor(plugin: AudioInboxPlugin, fileOps: FileOperations) {
        this.plugin = plugin;
        this.fileOps = fileOps;
    }

    /**
     * Render the folder setup section
     */
    render(containerEl: HTMLElement): void {
        containerEl.createEl('h3', { text: 'Folder Setup' });
        
        // Check if folder structure exists and show status
        const structureStatus = this.fileOps.checkInboxStructure();
        const statusEl = containerEl.createEl('div', { cls: 'audio-inbox-folder-status' });
        
        if (structureStatus.exists) {
            statusEl.addClass('audio-inbox-folder-status-success');
            statusEl.innerHTML = '✅ <strong>Inbox structure is ready!</strong> All required folders exist.';
        } else {
            statusEl.addClass('audio-inbox-folder-status-warning');
            statusEl.innerHTML = `⚠️ <strong>Setup Required:</strong> Missing folders: ${structureStatus.missingFolders.join(', ')}`;
        }
        
        // Create Initial Folders Button
        new Setting(containerEl)
            .setName('Create Inbox Folders')
            .setDesc('Create folder structure based on your pipeline configuration')
            .addButton(button => button
                .setButtonText('Create Entry Point Folders')
                .onClick(async () => {
                    button.setDisabled(true);
                    button.setButtonText('Creating...');
                    
                    try {
                        // Get pipeline configuration
                        const pipelineConfig = this.plugin.settings.parsedPipelineConfig;
                        if (!pipelineConfig) {
                            throw new Error('No pipeline configuration found. Please configure your pipeline first.');
                        }

                        const result = await this.fileOps.createEntryPointFolders(pipelineConfig);
                        
                        if (result.success) {
                            new Notice(`✅ Created ${result.foldersCreated} entry point folders!`, 5000);
                        } else {
                            new Notice(`⚠️ Partial success: Created ${result.foldersCreated} folders, ${result.errors.length} errors`, 8000);
                        }
                        
                    } catch (error) {
                        new Notice(`❌ Failed to create entry point folders: ${error instanceof Error ? error.message : String(error)}`, 8000);
                    } finally {
                        button.setDisabled(false);
                        button.setButtonText('Create Entry Points Only');
                    }
                }));
    }
}
