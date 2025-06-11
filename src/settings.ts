import { App, PluginSettingTab, Setting } from 'obsidian';
import AudioInboxPlugin from './main';
import { 
    AudioInboxSettings, 
    LogLevel, 
    DEFAULT_CATEGORIES,
    isValidLogLevel,
    PipelineConfiguration 
} from './types';

/**
 * Default settings for the plugin
 */
export const DEFAULT_SETTINGS: AudioInboxSettings = {
    pipelineConfig: '{}', // Will be populated with default pipeline configuration later
    debugMode: false,
    logLevel: LogLevel.INFO,
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
 * Convert LogLevel enum to string for display
 */
function logLevelToString(level: LogLevel): string {
    switch (level) {
        case LogLevel.ERROR: return 'error';
        case LogLevel.WARN: return 'warn';
        case LogLevel.INFO: return 'info';
        case LogLevel.DEBUG: return 'debug';
        default: return 'info';
    }
}

/**
 * Convert string to LogLevel enum
 */
function stringToLogLevel(str: string): LogLevel {
    switch (str.toLowerCase()) {
        case 'error': return LogLevel.ERROR;
        case 'warn': return LogLevel.WARN;
        case 'info': return LogLevel.INFO;
        case 'debug': return LogLevel.DEBUG;
        default: return LogLevel.INFO;
    }
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
                .setValue(logLevelToString(this.plugin.settings.logLevel))
                .onChange(async (value: string) => {
                    const logLevel = stringToLogLevel(value);
                    if (isValidLogLevel(logLevel)) {
                        this.plugin.settings.logLevel = logLevel;
                        await this.plugin.saveSettings();
                    } else {
                        console.error('Invalid log level:', value);
                    }
                }));

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
        
        // Status Section
        containerEl.createEl('h3', { text: 'Plugin Status' });
        
        const statusEl = containerEl.createEl('div');
        const lastSaved = this.plugin.settings.lastSaved 
            ? new Date(this.plugin.settings.lastSaved).toLocaleString()
            : 'Never';
            
        statusEl.innerHTML = `
            <p><strong>Version:</strong> ${this.plugin.manifest.version}</p>
            <p><strong>Settings Version:</strong> ${this.plugin.settings.version}</p>
            <p><strong>Status:</strong> <span style="color: green;">Ready</span></p>
            <p><strong>Debug Mode:</strong> ${this.plugin.settings.debugMode ? '<span style="color: orange;">Enabled</span>' : '<span style="color: gray;">Disabled</span>'}</p>
            <p><strong>Log Level:</strong> <code>${logLevelToString(this.plugin.settings.logLevel).toUpperCase()}</code></p>
            <p><strong>Last Saved:</strong> ${lastSaved}</p>
        `;

        // Type Information Section (for developers)
        if (this.plugin.settings.debugMode) {
            containerEl.createEl('h3', { text: 'Debug Information' });
            
            const debugEl = containerEl.createEl('details');
            const debugSummaryEl = debugEl.createEl('summary');
            debugSummaryEl.textContent = 'Type System Information';
            
            const debugCodeEl = debugEl.createEl('pre');
            debugCodeEl.style.background = '#f0f0f0';
            debugCodeEl.style.padding = '10px';
            debugCodeEl.style.borderRadius = '4px';
            debugCodeEl.style.fontSize = '11px';
            debugCodeEl.style.overflow = 'auto';
            debugCodeEl.textContent = `
Type System Status:
- Pipeline configuration interface: ✓ Defined
- File processing types: ✓ Defined  
- YAML frontmatter types: ✓ Defined
- Template system types: ✓ Defined
- Validation types: ✓ Defined
- Error handling types: ✓ Defined
- API integration types: ✓ Defined

Settings Structure:
${JSON.stringify(this.plugin.settings, null, 2)}
`;
        }

        // Future Features Section
        containerEl.createEl('h3', { text: 'Coming Soon' });
        
        const futureEl = containerEl.createEl('ul');
        futureEl.innerHTML = `
            <li>✅ <strong>Type System</strong> - Complete TypeScript interfaces</li>
            <li>🔄 <strong>Logging System</strong> - Structured logging with levels</li>
            <li>🔄 <strong>Error Handling</strong> - Comprehensive error management</li>
            <li>🔄 <strong>Validation Framework</strong> - Input validation and type checking</li>
            <li>📅 <strong>JSON Pipeline Editor</strong> - Interactive configuration editing</li>
            <li>📅 <strong>Audio File Processing</strong> - Whisper API integration</li>
            <li>📅 <strong>Template System</strong> - File-based template processing</li>
            <li>📅 <strong>Category Routing</strong> - Automatic file organization</li>
        `;
    }
}
