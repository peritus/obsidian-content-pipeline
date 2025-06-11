import { App, PluginSettingTab, Setting } from 'obsidian';
import AudioInboxPlugin from './main';

/**
 * Settings interface for the Audio Inbox plugin
 */
export interface AudioInboxSettings {
    /** JSON string containing the complete pipeline configuration */
    pipelineConfig: string;
    /** Enable debug mode for additional logging and diagnostics */
    debugMode: boolean;
    /** Log level for the plugin operations */
    logLevel: 'error' | 'warn' | 'info' | 'debug';
}

/**
 * Default settings for the plugin
 */
export const DEFAULT_SETTINGS: AudioInboxSettings = {
    pipelineConfig: '{}', // Will be populated with default pipeline configuration later
    debugMode: false,
    logLevel: 'info'
};

/**
 * Type guard for log level validation
 */
function isValidLogLevel(value: string): value is 'error' | 'warn' | 'info' | 'debug' {
    return ['error', 'warn', 'info', 'debug'].includes(value);
}

/**
 * Settings tab for the Audio Inbox plugin
 */
export class AudioInboxSettingTab extends PluginSettingTab {
    plugin: AudioInboxPlugin;

    constructor(app: App, plugin: AudioInboxPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();

        // Header
        containerEl.createEl('h2', { text: 'Audio Inbox Settings' });

        // Description
        const descEl = containerEl.createEl('p');
        descEl.innerHTML = 'Configure your audio processing pipeline. This plugin processes audio files through a configurable linear pipeline, transforming recordings into organized knowledge documents.';

        // Debug Mode Setting
        new Setting(containerEl)
            .setName('Debug Mode')
            .setDesc('Enable debug mode for additional logging and diagnostics')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.debugMode)
                .onChange(async (value) => {
                    this.plugin.settings.debugMode = value;
                    await this.plugin.saveSettings();
                }));

        // Log Level Setting
        new Setting(containerEl)
            .setName('Log Level')
            .setDesc('Set the logging level for plugin operations')
            .addDropdown(dropdown => dropdown
                .addOption('error', 'Error')
                .addOption('warn', 'Warning')
                .addOption('info', 'Info')
                .addOption('debug', 'Debug')
                .setValue(this.plugin.settings.logLevel)
                .onChange(async (value: string) => {
                    if (isValidLogLevel(value)) {
                        this.plugin.settings.logLevel = value;
                        await this.plugin.saveSettings();
                    } else {
                        console.error('Invalid log level:', value);
                    }
                }));

        // Pipeline Configuration Section (placeholder)
        containerEl.createEl('h3', { text: 'Pipeline Configuration' });
        
        const pipelineDescEl = containerEl.createEl('p');
        pipelineDescEl.innerHTML = 'Pipeline configuration will be available in a future update. This will allow you to define custom processing steps for your audio files.';
        
        // Placeholder for pipeline configuration
        new Setting(containerEl)
            .setName('Pipeline Configuration (Coming Soon)')
            .setDesc('JSON configuration for the audio processing pipeline')
            .addTextArea(text => {
                text.setPlaceholder('Pipeline configuration will be editable here...')
                    .setValue('Pipeline configuration editor coming soon...')
                    .setDisabled(true);
                text.inputEl.rows = 8;
                text.inputEl.cols = 50;
                return text;
            });

        // Categories Section (placeholder)
        containerEl.createEl('h3', { text: 'Categories' });
        
        const categoriesDescEl = containerEl.createEl('p');
        categoriesDescEl.innerHTML = 'Categories help organize your processed audio files. Default categories include: <code>tasks</code>, <code>thoughts</code>, and <code>uncategorized</code>.';
        
        // Status Section
        containerEl.createEl('h3', { text: 'Plugin Status' });
        
        const statusEl = containerEl.createEl('div');
        statusEl.innerHTML = `
            <p><strong>Version:</strong> ${this.plugin.manifest.version}</p>
            <p><strong>Status:</strong> <span style="color: green;">Ready</span></p>
            <p><strong>Debug Mode:</strong> ${this.plugin.settings.debugMode ? '<span style="color: orange;">Enabled</span>' : '<span style="color: gray;">Disabled</span>'}</p>
        `;

        // Future Features Section
        containerEl.createEl('h3', { text: 'Coming Soon' });
        
        const futureEl = containerEl.createEl('ul');
        futureEl.innerHTML = `
            <li>JSON Pipeline Configuration Editor</li>
            <li>Audio File Processing</li>
            <li>Category Management</li>
            <li>Template System</li>
            <li>API Integration (OpenAI Whisper & ChatGPT)</li>
        `;
    }
}
