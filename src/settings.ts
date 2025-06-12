import { App, PluginSettingTab, Setting, Notice } from 'obsidian';
import AudioInboxPlugin from './main';
import { 
    AudioInboxSettings, 
    DEFAULT_CATEGORIES,
    PipelineConfiguration 
} from './types';
import { getBuildLogLevel } from './logger';
import { FileOperations } from './core/file-operations';

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
 * Default settings for the plugin
 * NOTE: Log level is now controlled at build-time via OBSIDIAN_AUDIO_INBOX_LOGLEVEL
 */
export const DEFAULT_SETTINGS: AudioInboxSettings = {
    pipelineConfig: JSON.stringify(DEFAULT_PIPELINE_CONFIG, null, 2), // Initialize with default config
    debugMode: false,
    defaultCategories: [...DEFAULT_CATEGORIES],
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
        descEl.innerHTML = 'Configure your audio processing pipeline. This plugin processes audio files through a configurable linear pipeline, transforming recordings into organized knowledge documents.';

        // Setup Section
        containerEl.createEl('h3', { text: 'Initial Setup' });
        
        // Check if folder structure exists and show status
        const structureStatus = this.fileOps.checkInboxStructure();
        const statusEl = containerEl.createEl('div');
        statusEl.style.marginBottom = '15px';
        statusEl.style.padding = '10px';
        statusEl.style.borderRadius = '4px';
        
        if (structureStatus.exists) {
            statusEl.style.backgroundColor = '#d4edda';
            statusEl.style.border = '1px solid #c3e6cb';
            statusEl.style.color = '#155724';
            statusEl.innerHTML = '✅ <strong>Inbox structure is ready!</strong> All required folders exist.';
        } else {
            statusEl.style.backgroundColor = '#f8d7da';
            statusEl.style.border = '1px solid #f5c6cb';
            statusEl.style.color = '#721c24';
            statusEl.innerHTML = `⚠️ <strong>Setup Required:</strong> Missing folders: ${structureStatus.missingFolders.join(', ')}`;
        }
        
        // Create Initial Folders Button
        new Setting(containerEl)
            .setName('Create Inbox Folders')
            .setDesc('Create the complete folder structure for audio processing pipeline')
            .addButton(button => button
                .setButtonText('Create All Folders')
                .setCta()
                .onClick(async () => {
                    button.setDisabled(true);
                    button.setButtonText('Creating...');
                    
                    try {
                        const result = await this.fileOps.createInboxStructure(this.plugin.settings.defaultCategories);
                        
                        if (result.success) {
                            new Notice(`✅ Created ${result.foldersCreated} folders successfully!`, 5000);
                        } else {
                            new Notice(`⚠️ Partial success: Created ${result.foldersCreated} folders, ${result.errors.length} errors`, 8000);
                        }
                        
                        // Refresh the display to update status
                        this.display();
                        
                    } catch (error) {
                        new Notice(`❌ Failed to create folders: ${error instanceof Error ? error.message : String(error)}`, 8000);
                    } finally {
                        button.setDisabled(false);
                        button.setButtonText('Create All Folders');
                    }
                }))
            .addButton(button => button
                .setButtonText('Create Entry Points Only')
                .onClick(async () => {
                    button.setDisabled(true);
                    button.setButtonText('Creating...');
                    
                    try {
                        const result = await this.fileOps.createEntryPointFolders(this.plugin.settings.defaultCategories);
                        
                        if (result.success) {
                            new Notice(`✅ Created ${result.foldersCreated} entry point folders!`, 5000);
                        } else {
                            new Notice(`⚠️ Partial success: Created ${result.foldersCreated} folders, ${result.errors.length} errors`, 8000);
                        }
                        
                        // Refresh the display to update status
                        this.display();
                        
                    } catch (error) {
                        new Notice(`❌ Failed to create entry point folders: ${error instanceof Error ? error.message : String(error)}`, 8000);
                    } finally {
                        button.setDisabled(false);
                        button.setButtonText('Create Entry Points Only');
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
                }))
            .addButton(button => button
                .setButtonText('Create Category Folders')
                .setTooltip('Create folders for current categories')
                .onClick(async () => {
                    button.setDisabled(true);
                    button.setButtonText('Creating...');
                    
                    try {
                        let totalCreated = 0;
                        let totalErrors = 0;
                        
                        for (const category of this.plugin.settings.defaultCategories) {
                            const result = await this.fileOps.createCategoryFolders(category);
                            totalCreated += result.foldersCreated;
                            totalErrors += result.errors.length;
                        }
                        
                        if (totalErrors === 0) {
                            new Notice(`✅ Created ${totalCreated} category folders!`, 5000);
                        } else {
                            new Notice(`⚠️ Created ${totalCreated} folders with ${totalErrors} errors`, 6000);
                        }
                        
                    } catch (error) {
                        new Notice(`❌ Failed to create category folders: ${error instanceof Error ? error.message : String(error)}`, 8000);
                    } finally {
                        button.setDisabled(false);
                        button.setButtonText('Create Category Folders');
                    }
                }));

        // Pipeline Configuration Section 
        containerEl.createEl('h3', { text: 'Pipeline Configuration' });
        
        const pipelineDescEl = containerEl.createEl('p');
        pipelineDescEl.innerHTML = 'The pipeline configuration defines how audio files are processed. Default configuration is loaded and ready to use.';
        
        // Initialize pipeline config button
        if (!this.plugin.settings.parsedPipelineConfig || this.plugin.settings.pipelineConfig === '{}') {
            new Setting(containerEl)
                .setName('Initialize Default Pipeline')
                .setDesc('Load the default pipeline configuration for audio processing')
                .addButton(button => button
                    .setButtonText('Load Default Config')
                    .setCta()
                    .onClick(async () => {
                        this.plugin.settings.pipelineConfig = JSON.stringify(DEFAULT_PIPELINE_CONFIG, null, 2);
                        this.plugin.settings.parsedPipelineConfig = DEFAULT_PIPELINE_CONFIG;
                        await this.plugin.saveSettings();
                        new Notice('✅ Default pipeline configuration loaded!', 4000);
                        this.display(); // Refresh display
                    }));
        }
        
        // Show current pipeline status
        const pipelineStatusEl = containerEl.createEl('div');
        pipelineStatusEl.style.marginBottom = '15px';
        pipelineStatusEl.style.padding = '10px';
        pipelineStatusEl.style.borderRadius = '4px';
        
        if (this.plugin.settings.parsedPipelineConfig) {
            const stepCount = Object.keys(this.plugin.settings.parsedPipelineConfig).length;
            pipelineStatusEl.style.backgroundColor = '#d4edda';
            pipelineStatusEl.style.border = '1px solid #c3e6cb';
            pipelineStatusEl.style.color = '#155724';
            pipelineStatusEl.innerHTML = `✅ <strong>Pipeline Ready:</strong> ${stepCount} steps configured`;
        } else {
            pipelineStatusEl.style.backgroundColor = '#fff3cd';
            pipelineStatusEl.style.border = '1px solid #ffeaa7';
            pipelineStatusEl.style.color = '#856404';
            pipelineStatusEl.innerHTML = '⚠️ <strong>No Pipeline Configured:</strong> Initialize default configuration to get started';
        }
        
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
        pipelineCodeEl.style.maxHeight = '300px';
        pipelineCodeEl.textContent = JSON.stringify(DEFAULT_PIPELINE_CONFIG, null, 2);

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

        // Instructions Section
        containerEl.createEl('h3', { text: 'Getting Started' });
        
        const instructionsEl = containerEl.createEl('div');
        instructionsEl.innerHTML = `
            <ol>
                <li><strong>Create Folders:</strong> Click "Create All Folders" to set up the inbox structure</li>
                <li><strong>Initialize Pipeline:</strong> Click "Load Default Config" to set up the processing pipeline</li>
                <li><strong>Add Audio Files:</strong> Place audio files in <code>inbox/audio/{category}/</code> folders</li>
                <li><strong>Process Files:</strong> Use the "Process Next File" command from the command palette</li>
            </ol>
            <p><strong>Note:</strong> API keys will need to be configured for OpenAI services in a future update.</p>
        `;
    }
}