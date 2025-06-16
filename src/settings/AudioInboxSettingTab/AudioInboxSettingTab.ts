import { App, PluginSettingTab } from 'obsidian';
import AudioInboxPlugin from '../../main';
import { FileOperations } from '../../core/file-operations';
import { DualConfigSection } from '../dual-config-section';
import { FolderSetupSection } from '../folder-setup-section';
import { ExamplePromptsManager } from './example-prompts-manager';
import { GettingStartedRenderer } from './getting-started-renderer';

/**
 * Settings tab for the Audio Inbox plugin (v1.2 dual configuration)
 */
export class AudioInboxSettingTab extends PluginSettingTab {
    plugin: AudioInboxPlugin;
    private fileOps: FileOperations;
    private examplePromptsManager: ExamplePromptsManager;

    constructor(app: App, plugin: AudioInboxPlugin) {
        super(app, plugin);
        this.plugin = plugin;
        this.fileOps = new FileOperations(app);
        this.examplePromptsManager = new ExamplePromptsManager(app);
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

        // Example Prompts Setup Section
        this.examplePromptsManager.render(containerEl);

        // Folder Setup Section
        const folderSection = new FolderSetupSection(this.plugin, this.fileOps);
        folderSection.render(containerEl);

        // Getting Started Section
        GettingStartedRenderer.render(containerEl);
    }
}