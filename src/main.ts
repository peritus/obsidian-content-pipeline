import { Plugin, Notice } from 'obsidian';
import { DEFAULT_SETTINGS, AudioInboxSettingTab, DEFAULT_PIPELINE_CONFIG } from './settings';
import { AudioInboxSettings, PipelineConfiguration, ProcessingStatus } from './types';
import { createLogger, getBuildLogLevel } from './logger';
import { PipelineExecutor } from './core/pipeline-executor';

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
            this.showNotice(`Audio Inbox ready! Pipeline: ${this.settings.parsedPipelineConfig ? 'Configured' : 'Not configured'}`);
        });

        // Register commands
        this.addCommand({
            id: 'process-next-file',
            name: 'Process Next File',
            callback: () => this.processNextFileCommand()
        });

        // Register settings tab
        this.addSettingTab(new AudioInboxSettingTab(this.app, this));

        this.logger.info('Audio Inbox Plugin initialization complete');
    }

    /**
     * Called when the plugin is unloaded
     */
    onunload() {
        this.logger.info('Audio Inbox Plugin unloaded');
    }

    /**
     * Command handler for processing the next available file
     */
    private async processNextFileCommand(): Promise<void> {
        try {
            this.logger.info('Process Next File command triggered');
            
            // Check if pipeline configuration is available
            if (!this.settings.parsedPipelineConfig) {
                this.showNotice('❌ No pipeline configuration found. Please open settings and initialize the default pipeline.', 8000);
                this.logger.error('No pipeline configuration available');
                return;
            }

            // Show processing started notification
            this.showNotice('🔄 Processing next file...', 3000);
            
            // Create executor and process file
            const executor = new PipelineExecutor(this.app, this.settings);
            const result = await executor.processNextFile();
            
            // Handle result based on status
            switch (result.status) {
                case ProcessingStatus.COMPLETED:
                    const outputCount = result.outputFiles.length;
                    this.showNotice(
                        `✅ Successfully processed: ${result.inputFile.name} → ${outputCount} output file(s)`, 
                        6000
                    );
                    this.logger.info(`File processed successfully: ${result.inputFile.path}`, {
                        outputFiles: result.outputFiles,
                        stepId: result.stepId
                    });
                    break;
                    
                case ProcessingStatus.SKIPPED:
                    this.showNotice('ℹ️ No files found to process. Place audio files in inbox/audio/{category}/ folders.', 6000);
                    this.logger.info('No files available for processing');
                    break;
                    
                case ProcessingStatus.FAILED:
                    this.showNotice(`❌ Processing failed: ${result.error || 'Unknown error'}`, 8000);
                    this.logger.error('File processing failed:', {
                        error: result.error,
                        inputFile: result.inputFile?.path,
                        stepId: result.stepId
                    });
                    break;
                    
                default:
                    this.showNotice('⚠️ Processing completed with unknown status', 5000);
                    this.logger.warn('Unexpected processing status:', result.status);
            }
            
        } catch (error) {
            this.logger.error('Process Next File command failed:', error);
            
            // Show user-friendly error message
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            this.showNotice(`❌ Failed to process file: ${errorMessage}`, 8000);
            
            // Log detailed error information
            this.logger.error('Command execution error details:', {
                error: errorMessage,
                stack: error instanceof Error ? error.stack : undefined
            });
        }
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
            
            // Ensure we have a pipeline configuration
            if (!this.settings.pipelineConfig || this.settings.pipelineConfig === '{}') {
                this.settings.pipelineConfig = JSON.stringify(DEFAULT_PIPELINE_CONFIG, null, 2);
                this.settings.parsedPipelineConfig = DEFAULT_PIPELINE_CONFIG;
                this.logger.info('Initialized with default pipeline configuration');
                await this.saveSettings(); // Save the default config
            } else {
                // Parse existing configuration
                try {
                    this.settings.parsedPipelineConfig = JSON.parse(this.settings.pipelineConfig) as PipelineConfiguration;
                    this.logger.debug('Pipeline configuration parsed successfully');
                } catch (error) {
                    this.logger.error('Failed to parse pipeline configuration, resetting to default:', error);
                    this.settings.pipelineConfig = JSON.stringify(DEFAULT_PIPELINE_CONFIG, null, 2);
                    this.settings.parsedPipelineConfig = DEFAULT_PIPELINE_CONFIG;
                    await this.saveSettings();
                }
            }
            
            this.logger.info('Settings loaded successfully');
        } catch (error) {
            this.logger.error('Failed to load settings, using defaults:', error);
            this.settings = Object.assign({}, DEFAULT_SETTINGS);
            this.settings.lastSaved = new Date().toISOString();
            this.settings.version = this.manifest.version;
            this.settings.pipelineConfig = JSON.stringify(DEFAULT_PIPELINE_CONFIG, null, 2);
            this.settings.parsedPipelineConfig = DEFAULT_PIPELINE_CONFIG;
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
        } catch (error) {
            this.logger.error('Failed to save settings:', error);
            throw error;
        }
    }

    /**
     * Show a notice to the user
     */
    private showNotice(message: string, timeout: number = 5000): void {
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