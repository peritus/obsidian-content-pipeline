import { App, PluginSettingTab } from 'obsidian';
import AudioInboxPlugin from './main';
import { AudioInboxSettings } from './types';
import { FileOperations } from './core/file-operations';
import { DEFAULT_PIPELINE_CONFIG } from './settings/default-config';
import { PipelineConfigSection } from './settings/pipeline-config-section';
import { FolderSetupSection } from './settings/folder-setup-section';

/**
 * Default settings for the plugin
 */
export const DEFAULT_SETTINGS: AudioInboxSettings = {
    pipelineConfig: JSON.stringify(DEFAULT_PIPELINE_CONFIG, null, 2),
    debugMode: false,
    version: '1.0.0',
    lastSaved: undefined
};

/**
 * Settings tab for the Audio Inbox plugin
 */
export class AudioInboxSettingTab extends PluginSettingTab {
    plugin: AudioInboxPlugin;
    private fileOps: FileOperations;

    constructor(app: App, plugin: AudioInboxPlugin) {
        super(app, plugin);
        this.plugin = plugin;
        this.fileOps = new FileOperations(app);
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        // Header
        containerEl.createEl('h2', { text: 'Audio Inbox Settings' });

        // Description
        const descEl = containerEl.createEl('p');
        descEl.innerHTML = 'Configure your audio processing pipeline with intelligent step routing. Edit the JSON configuration below to customize your pipeline and add your API keys.';

        // Pipeline Configuration Section
        const pipelineSection = new PipelineConfigSection(this.plugin);
        pipelineSection.render(containerEl);

        // Folder Setup Section
        const folderSection = new FolderSetupSection(this.plugin, this.fileOps);
        folderSection.render(containerEl);

        // Getting Started Section
        this.renderGettingStarted(containerEl);
    }

    /**
     * Render getting started section
     */
    private renderGettingStarted(containerEl: HTMLElement): void {
        containerEl.createEl('h3', { text: 'Getting Started' });
        
        const instructionsEl = containerEl.createEl('div');
        instructionsEl.innerHTML = `
            <ol>
                <li><strong>Configure Pipeline:</strong> Add your OpenAI API key to the "apiKey" fields above</li>
                <li><strong>Create Folders:</strong> Click "Create Initial Folders" to set up the inbox structure</li>
                <li><strong>Add Audio Files:</strong> Place audio files in <code>inbox/audio/</code> folder</li>
                <li><strong>Process Files:</strong> Use the "Process Next File" command from the command palette</li>
            </ol>
            <p><strong>Tip:</strong> The default configuration uses intelligent routing to automatically organize your content!</p>
        `;
    }
}

// Export the default config for backwards compatibility
export { DEFAULT_PIPELINE_CONFIG };
