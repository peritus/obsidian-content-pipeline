import { Plugin } from 'obsidian';
import { AudioInboxSettings, DEFAULT_SETTINGS, AudioInboxSettingTab } from './settings';

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
        
        // Add ribbon icon
        this.addRibbonIcon('microphone', 'Audio Inbox', () => {
            console.log('Audio Inbox clicked!');
            console.log('Debug mode:', this.settings.debugMode);
            console.log('Log level:', this.settings.logLevel);
        });

        // Register settings tab
        this.addSettingTab(new AudioInboxSettingTab(this.app, this));

        console.log('Audio Inbox Plugin initialization complete');
    }

    /**
     * Called when the plugin is unloaded
     */
    onunload() {
        console.log('Audio Inbox Plugin unloaded');
    }

    /**
     * Load plugin settings from disk
     */
    async loadSettings() {
        try {
            const loadedData = await this.loadData();
            this.settings = Object.assign({}, DEFAULT_SETTINGS, loadedData);
            console.log('Settings loaded successfully:', this.settings);
        } catch (error) {
            console.error('Failed to load settings, using defaults:', error);
            this.settings = Object.assign({}, DEFAULT_SETTINGS);
        }
    }

    /**
     * Save plugin settings to disk
     */
    async saveSettings() {
        try {
            await this.saveData(this.settings);
            console.log('Settings saved successfully:', this.settings);
        } catch (error) {
            console.error('Failed to save settings:', error);
            throw error;
        }
    }
}
