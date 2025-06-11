import { Plugin } from 'obsidian';
import { DEFAULT_SETTINGS, AudioInboxSettingTab } from './settings';
import { AudioInboxSettings, PipelineConfiguration } from './types';
import { createLogger, getBuildLogLevel } from './logger';

/**
 * Main plugin class for Audio Inbox
 */
export default class AudioInboxPlugin extends Plugin {
    settings!: AudioInboxSettings; // Definite assignment assertion since we load in onload
    private logger = createLogger('Main');

    /**
     * Called when the plugin is loaded
     */
    async onload() {
        this.logger.info('Audio Inbox Plugin loaded!');
        
        // Load settings
        await this.loadSettings();
        
        // Log initialization info
        this.logger.info('Plugin initialization started');
        this.logger.debug('Settings loaded:', this.settings);
        this.logger.debug('Build-time log level:', getBuildLogLevel());
        
        // Add ribbon icon
        this.addRibbonIcon('microphone', 'Audio Inbox', () => {
            this.logger.info('Audio Inbox ribbon clicked');
            this.logger.debug('Current settings:', {
                debugMode: this.settings.debugMode,
                buildLogLevel: getBuildLogLevel(),
                categories: this.settings.defaultCategories,
                version: this.settings.version
            });
            
            // Show a quick status message
            this.showNotice(`Audio Inbox: Debug=${this.settings.debugMode}, Log=${getBuildLogLevel().toUpperCase()}`);
        });

        // Register settings tab
        this.addSettingTab(new AudioInboxSettingTab(this.app, this));

        this.logger.info('Audio Inbox Plugin initialization complete');
        this.logger.debug('Type system and logging initialized');
    }

    /**
     * Called when the plugin is unloaded
     */
    onunload() {
        this.logger.info('Audio Inbox Plugin unloaded');
    }

    /**
     * Load plugin settings from disk
     */
    async loadSettings() {
        try {
            const loadedData = await this.loadData();
            this.settings = Object.assign({}, DEFAULT_SETTINGS, loadedData);
            
            // Update last saved timestamp and version
            this.settings.lastSaved = new Date().toISOString();
            this.settings.version = this.manifest.version;
            
            // Parse pipeline configuration if it's valid JSON
            if (this.settings.pipelineConfig && this.settings.pipelineConfig !== '{}') {
                try {
                    this.settings.parsedPipelineConfig = JSON.parse(this.settings.pipelineConfig) as PipelineConfiguration;
                    this.logger.debug('Pipeline configuration parsed successfully');
                } catch (error) {
                    this.logger.error('Failed to parse pipeline configuration:', error);
                    this.settings.parsedPipelineConfig = undefined;
                }
            }
            
            this.logger.info('Settings loaded successfully');
            this.logger.debug('Loaded settings:', this.settings);
        } catch (error) {
            this.logger.error('Failed to load settings, using defaults:', error);
            this.settings = Object.assign({}, DEFAULT_SETTINGS);
            this.settings.lastSaved = new Date().toISOString();
            this.settings.version = this.manifest.version;
        }
    }

    /**
     * Save plugin settings to disk
     */
    async saveSettings() {
        try {
            // Update timestamp before saving
            this.settings.lastSaved = new Date().toISOString();
            
            await this.saveData(this.settings);
            this.logger.info('Settings saved successfully');
            this.logger.debug('Saved settings:', this.settings);
        } catch (error) {
            this.logger.error('Failed to save settings:', error);
            throw error;
        }
    }

    /**
     * Show a notice to the user
     */
    private showNotice(message: string, timeout: number = 5000): void {
        // @ts-ignore - Notice is available but not in types
        new Notice(message, timeout);
    }

    /**
     * Get parsed pipeline configuration (type-safe)
     */
    public getPipelineConfiguration(): PipelineConfiguration | undefined {
        return this.settings.parsedPipelineConfig;
    }

    /**
     * Get default categories (type-safe)
     */
    public getDefaultCategories(): string[] {
        return [...this.settings.defaultCategories];
    }

    /**
     * Check if debug mode is enabled
     */
    public isDebugMode(): boolean {
        return this.settings.debugMode;
    }

    /**
     * Get build-time log level (read-only)
     */
    public getBuildLogLevel(): string {
        return getBuildLogLevel().toUpperCase();
    }

    /**
     * Get logger instance for this plugin
     */
    public getLogger() {
        return this.logger;
    }

    /**
     * Create a logger for a specific component
     */
    public createComponentLogger(component: string) {
        return createLogger(component);
    }
}
