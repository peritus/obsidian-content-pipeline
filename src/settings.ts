import { App, PluginSettingTab } from 'obsidian';
import AudioInboxPlugin from './main';
import { AudioInboxSettings } from './types';
import { FileOperations } from './core/file-operations';
import { DEFAULT_MODELS_CONFIG, DEFAULT_PIPELINE_CONFIG } from './settings/default-config';
import { DualConfigSection } from './settings/dual-config-section';
import { FolderSetupSection } from './settings/folder-setup-section';

/**
 * Default settings for the plugin (v1.2 dual configuration)
 */
export const DEFAULT_SETTINGS: AudioInboxSettings = {
    modelsConfig: JSON.stringify(DEFAULT_MODELS_CONFIG, null, 2),
    pipelineConfig: JSON.stringify(DEFAULT_PIPELINE_CONFIG, null, 2),
    debugMode: false,
    version: '1.0.0',
    lastSaved: undefined
};

/**
 * Settings tab for the Audio Inbox plugin (v1.2 dual configuration)
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
        descEl.innerHTML = `
            Configure your audio processing pipeline with intelligent step routing using the new dual configuration system. 
            <strong>Models Configuration</strong> contains private API credentials, while <strong>Pipeline Configuration</strong> 
            contains shareable workflow logic.
        `;

        // Dual Configuration Section (v1.2)
        const dualConfigSection = new DualConfigSection(this.plugin);
        dualConfigSection.render(containerEl);

        // Folder Setup Section
        const folderSection = new FolderSetupSection(this.plugin, this.fileOps);
        folderSection.render(containerEl);

        // Getting Started Section
        this.renderGettingStarted(containerEl);
    }

    /**
     * Render getting started section with v1.2 instructions
     */
    private renderGettingStarted(containerEl: HTMLElement): void {
        containerEl.createEl('h3', { text: 'Getting Started' });
        
        const instructionsEl = containerEl.createEl('div');
        instructionsEl.innerHTML = `
            <ol>
                <li><strong>Load Default Configurations:</strong> Click the "Load Default" buttons for both Models and Pipeline configurations</li>
                <li><strong>Add API Keys:</strong> Replace empty API key fields in the Models Configuration with your OpenAI API key</li>
                <li><strong>Save Configuration:</strong> Click "Save Configuration" to validate and save your settings</li>
                <li><strong>Create Folders:</strong> Click "Create Initial Folders" to set up the inbox structure</li>
                <li><strong>Add Audio Files:</strong> Place audio files in <code>inbox/audio/</code> folder</li>
                <li><strong>Process Files:</strong> Use the "Process Next File" command from the command palette or ribbon icon</li>
            </ol>
            
            <div style="margin-top: 15px; padding: 15px; background-color: var(--background-secondary); border-radius: 6px; border-left: 4px solid var(--interactive-accent);">
                <h4 style="margin-top: 0;">🔒 Security & Sharing</h4>
                <ul style="margin-bottom: 0;">
                    <li><strong>Models Configuration:</strong> Contains API keys - keep private, never share</li>
                    <li><strong>Pipeline Configuration:</strong> Contains workflow logic - safe to export and share with team</li>
                    <li><strong>Cross-Reference Validation:</strong> Ensures pipeline steps reference valid model configurations</li>
                    <li><strong>Multiple Providers:</strong> Support for different API accounts and cost optimization</li>
                </ul>
            </div>
            
            <div style="margin-top: 15px; padding: 15px; background-color: var(--background-secondary); border-radius: 6px;">
                <h4 style="margin-top: 0;">🎯 Key Features</h4>
                <ul style="margin-bottom: 0;">
                    <li><strong>Real-time Validation:</strong> Both configurations validated with detailed error reporting</li>
                    <li><strong>Pipeline Visualization:</strong> Visual overview of your processing workflow</li>
                    <li><strong>Export/Import:</strong> Share pipeline configurations safely without exposing credentials</li>
                    <li><strong>Intelligent Routing:</strong> LLM chooses optimal next processing steps based on content</li>
                </ul>
            </div>
        `;
    }
}

// Export the default configs for backwards compatibility
export { DEFAULT_MODELS_CONFIG, DEFAULT_PIPELINE_CONFIG };