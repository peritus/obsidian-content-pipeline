import { Plugin } from 'obsidian';
import { DEFAULT_SETTINGS, AudioInboxSettingTab } from './settings';
import { AudioInboxSettings, LogLevel, PipelineConfiguration } from './types';

/**
 * Main plugin class for Audio Inbox
 */
export default class AudioInboxPlugin extends Plugin {
    settings!: AudioInboxSettings; // Definite assignment assertion since we load in onload

    /**
     * Called when the plugin is loaded
     */
    async onload() {
        console.log('Audio Inbox Plugin loaded!');
        
        // Load settings
        await this.loadSettings();
        
        // Log initialization info based on log level
        this.logInfo('Plugin initialization started');
        this.logDebug('Settings loaded:', this.settings);
        
        // Add ribbon icon
        this.addRibbonIcon('microphone', 'Audio Inbox', () => {
            this.logInfo('Audio Inbox ribbon clicked');
            this.logDebug('Current settings:', {
                debugMode: this.settings.debugMode,
                logLevel: this.getLogLevelString(),
                categories: this.settings.defaultCategories,
                version: this.settings.version
            });
            
            // Show a quick status message
            this.showNotice(`Audio Inbox: Debug=${this.settings.debugMode}, Level=${this.getLogLevelString()}`);
        });

        // Register settings tab
        this.addSettingTab(new AudioInboxSettingTab(this.app, this));

        this.logInfo('Audio Inbox Plugin initialization complete');
        this.logDebug('Type system initialized with comprehensive interfaces');
    }

    /**
     * Called when the plugin is unloaded
     */
    onunload() {
        this.logInfo('Audio Inbox Plugin unloaded');
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
                    this.logDebug('Pipeline configuration parsed successfully');
                } catch (error) {
                    this.logError('Failed to parse pipeline configuration:', error);
                    this.settings.parsedPipelineConfig = undefined;
                }
            }
            
            this.logInfo('Settings loaded successfully');
            this.logDebug('Loaded settings:', this.settings);
        } catch (error) {
            this.logError('Failed to load settings, using defaults:', error);
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
            this.logInfo('Settings saved successfully');
            this.logDebug('Saved settings:', this.settings);
        } catch (error) {
            this.logError('Failed to save settings:', error);
            throw error;
        }
    }

    /**
     * Get current log level as string
     */
    private getLogLevelString(): string {
        switch (this.settings.logLevel) {
            case LogLevel.ERROR: return 'ERROR';
            case LogLevel.WARN: return 'WARN';
            case LogLevel.INFO: return 'INFO';
            case LogLevel.DEBUG: return 'DEBUG';
            default: return 'INFO';
        }
    }

    /**
     * Check if a log level should be output
     */
    private shouldLog(level: LogLevel): boolean {
        return level <= this.settings.logLevel;
    }

    /**
     * Log an error message
     */
    private logError(message: string, ...args: any[]): void {
        if (this.shouldLog(LogLevel.ERROR)) {
            console.error(`[Audio Inbox] ERROR: ${message}`, ...args);
        }
    }

    /**
     * Log a warning message
     */
    private logWarn(message: string, ...args: any[]): void {
        if (this.shouldLog(LogLevel.WARN)) {
            console.warn(`[Audio Inbox] WARN: ${message}`, ...args);
        }
    }

    /**
     * Log an info message
     */
    private logInfo(message: string, ...args: any[]): void {
        if (this.shouldLog(LogLevel.INFO)) {
            console.log(`[Audio Inbox] INFO: ${message}`, ...args);
        }
    }

    /**
     * Log a debug message
     */
    private logDebug(message: string, ...args: any[]): void {
        if (this.shouldLog(LogLevel.DEBUG)) {
            console.log(`[Audio Inbox] DEBUG: ${message}`, ...args);
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
     * Get current log level
     */
    public getLogLevel(): LogLevel {
        return this.settings.logLevel;
    }
}
