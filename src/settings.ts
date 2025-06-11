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

        // Build-time configuration notice
        const buildNoticeEl = containerEl.createEl('div');
        buildNoticeEl.style.background = '#f0f8ff';
        buildNoticeEl.style.border = '1px solid #b0d4f1';
        buildNoticeEl.style.borderRadius = '4px';
        buildNoticeEl.style.padding = '10px';
        buildNoticeEl.style.marginBottom = '20px';
        buildNoticeEl.innerHTML = `
            <p><strong>📋 Build-Time Configuration</strong></p>
            <p>Log level is set at build time: <code>${getBuildLogLevel().toUpperCase()}</code></p>
            <p><small>To change log level, rebuild with <code>OBSIDIAN_AUDIO_INBOX_LOGLEVEL=debug npm run build</code></small></p>
        `;

        // Debug Mode Setting
        new Setting(containerEl)
            .setName('Debug Mode')
            .setDesc('Enable debug mode for additional UI diagnostics and information')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.debugMode)
                .onChange(async (value) => {
                    this.plugin.settings.debugMode = value;
                    await this.plugin.saveSettings();
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
            <p><strong>Build Log Level:</strong> <code>${getBuildLogLevel().toUpperCase()}</code></p>
            <p><strong>Last Saved:</strong> ${lastSaved}</p>
        `;

        // Type Information Section (for developers)
        if (this.plugin.settings.debugMode) {
            containerEl.createEl('h3', { text: 'Debug Information' });
            
            const debugEl = containerEl.createEl('details');
            const debugSummaryEl = debugEl.createEl('summary');
            debugSummaryEl.textContent = 'Type System & Logging Information';
            
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

Logging System Status:
- Build-time log level: ${getBuildLogLevel().toUpperCase()}
- Logging system: ✓ Implemented
- Component-based logging: ✓ Available
- Structured logging: ✓ Available

Settings Structure:
${JSON.stringify(this.plugin.settings, null, 2)}
`;
        }

        // Build Information Section
        containerEl.createEl('h3', { text: 'Build Information' });
        
        const buildInfoEl = containerEl.createEl('div');
        buildInfoEl.innerHTML = `
            <p><strong>Build Log Level:</strong> <code>${getBuildLogLevel().toUpperCase()}</code></p>
            <p><strong>Available Log Levels:</strong> ERROR, WARN, INFO, DEBUG</p>
            <p><strong>Change Log Level:</strong> Rebuild with different <code>OBSIDIAN_AUDIO_INBOX_LOGLEVEL</code></p>
        `;

        // Build scripts examples
        const buildScriptsEl = containerEl.createEl('details');
        const buildScriptsSummaryEl = buildScriptsEl.createEl('summary');
        buildScriptsSummaryEl.textContent = 'Build Script Examples';
        
        const scriptsCodeEl = buildScriptsEl.createEl('pre');
        scriptsCodeEl.style.background = '#f5f5f5';
        scriptsCodeEl.style.padding = '10px';
        scriptsCodeEl.style.borderRadius = '4px';
        scriptsCodeEl.style.fontSize = '12px';
        scriptsCodeEl.style.overflow = 'auto';
        scriptsCodeEl.textContent = `# Production builds with different log levels
npm run build              # Default (warn level)
npm run build:error        # Error level only
npm run build:warn         # Warn level and above
npm run build:info         # Info level and above  
npm run build:debug        # Debug level (all logs)

# Development builds
npm run dev                # Debug level with watch
npm run dev:info           # Info level with watch
npm run dev:warn           # Warn level with watch`;

        // Future Features Section
        containerEl.createEl('h3', { text: 'Coming Soon' });
        
        const futureEl = containerEl.createEl('ul');
        futureEl.innerHTML = `
            <li>✅ <strong>Type System</strong> - Complete TypeScript interfaces</li>
            <li>✅ <strong>Logging System</strong> - Build-time structured logging</li>
            <li>🔄 <strong>Error Handling</strong> - Comprehensive error management</li>
            <li>🔄 <strong>Validation Framework</strong> - Input validation and type checking</li>
            <li>📅 <strong>JSON Pipeline Editor</strong> - Interactive configuration editing</li>
            <li>📅 <strong>Audio File Processing</strong> - Whisper API integration</li>
            <li>📅 <strong>Template System</strong> - File-based template processing</li>
            <li>📅 <strong>Category Routing</strong> - Automatic file organization</li>
        `;
    }
}
