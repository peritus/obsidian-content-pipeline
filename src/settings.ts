import { App, PluginSettingTab, Setting } from 'obsidian';
import AudioInboxPlugin from './main';
import { 
    AudioInboxSettings, 
    DEFAULT_CATEGORIES,
    PipelineConfiguration 
} from './types';
import { getBuildLogLevel } from './logger';

/**
 * Default settings for the plugin
 * NOTE: Log level is now controlled at build-time via OBSIDIAN_AUDIO_INBOX_LOGLEVEL
 */
export const DEFAULT_SETTINGS: AudioInboxSettings = {
    pipelineConfig: '{}', // Will be populated with default pipeline configuration later
    debugMode: false,
    defaultCategories: [...DEFAULT_CATEGORIES],
    version: '1.0.0',
    lastSaved: undefined
};

/**
 * Default pipeline configuration that will be used in future steps
 */
export const DEFAULT_PIPELINE_CONFIG: PipelineConfiguration = {
    "transcribe": {
        "model": "whisper-1",
        "input": "inbox/audio/{category}",
        "output": "inbox/transcripts/{category}/{filename}-transcript.md",
        "archive": "inbox/archive/transcribe/{category}",
        "template": "inbox/templates/transcribe.md",
        "include": ["transcriptionprompt.md"],
        "apiKey": "",
        "baseUrl": "https://api.openai.com/v1",
        "next": "process"
    },
    "process": {
        "model": "gpt-4",
        "input": "inbox/transcripts/{category}",
        "output": "inbox/results/{category}/{filename}-processed.md",
        "archive": "inbox/archive/process/{category}",
        "template": "inbox/templates/process.md",
        "include": ["processingprompt.md"],
        "apiKey": "",
        "baseUrl": "https://api.openai.com/v1",
        "next": "summarize"
    },
    "summarize": {
        "model": "gpt-4",
        "input": "inbox/results/{category}",
        "output": "inbox/summary/{category}/",
        "archive": "inbox/archive/summarize/{category}",
        "template": "inbox/templates/summarize.md",
        "include": ["summariseprompt.md", "inbox/summary/{category}/*"],
        "apiKey": "",
        "baseUrl": "https://api.openai.com/v1"
    }
};

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

        // Categories Setting
        new Setting(containerEl)
            .setName('Default Categories')
            .setDesc('Comma-separated list of default categories to create')
            .addText(text => text
                .setPlaceholder('tasks, thoughts, uncategorized')
                .setValue(this.plugin.settings.defaultCategories.join(', '))
                .onChange(async (value) => {
                    // Parse and validate categories
                    const categories = value
                        .split(',')
                        .map((cat: string) => cat.trim())
                        .filter((cat: string) => cat.length > 0);
                    
                    this.plugin.settings.defaultCategories = categories.length > 0 
                        ? categories 
                        : [...DEFAULT_CATEGORIES];
                    await this.plugin.saveSettings();
                }));

        // Pipeline Configuration Section (placeholder)
        containerEl.createEl('h3', { text: 'Pipeline Configuration' });
        
        const pipelineDescEl = containerEl.createEl('p');
        pipelineDescEl.innerHTML = 'Pipeline configuration will be available in a future update. This will allow you to define custom processing steps for your audio files.';
        
        // Show default pipeline preview
        const pipelinePreviewEl = containerEl.createEl('details');
        const pipelineSummaryEl = pipelinePreviewEl.createEl('summary');
        pipelineSummaryEl.textContent = 'Preview: Default Pipeline Configuration';
        
        const pipelineCodeEl = pipelinePreviewEl.createEl('pre');
        pipelineCodeEl.style.background = '#f5f5f5';
        pipelineCodeEl.style.padding = '10px';
        pipelineCodeEl.style.borderRadius = '4px';
        pipelineCodeEl.style.fontSize = '12px';
        pipelineCodeEl.style.overflow = 'auto';
        pipelineCodeEl.textContent = JSON.stringify(DEFAULT_PIPELINE_CONFIG, null, 2);
        
        // Placeholder for pipeline configuration editor
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

        // Categories Management Section
        containerEl.createEl('h3', { text: 'Category Management' });
        
        const categoriesDescEl = containerEl.createEl('p');
        categoriesDescEl.innerHTML = 'Categories help organize your processed audio files. The plugin will create folder structures for each category.';
        
        // Display current categories
        const currentCategoriesEl = containerEl.createEl('div');
        currentCategoriesEl.innerHTML = `
            <p><strong>Current Categories:</strong></p>
            <ul>
                ${this.plugin.settings.defaultCategories.map((cat: string) => `<li><code>${cat}</code></li>`).join('')}
            </ul>
        `;
        }
    }
