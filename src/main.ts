import { Plugin, Notice } from 'obsidian';
import { DEFAULT_SETTINGS, AudioInboxSettingTab } from './settings';
import { AudioInboxSettings, PipelineConfiguration, ModelsConfig, ProcessingStatus } from './types';
import { createLogger, getBuildLogLevel } from './logger';
import { PipelineExecutor } from './core/pipeline-executor';
import { createConfigurationResolver } from './validation/configuration-resolver';
import { DEFAULT_MODELS_CONFIG, DEFAULT_PIPELINE_CONFIG } from './settings/default-config';

/**
 * Main plugin class for Audio Inbox (v1.2 dual configuration)
 */
export default class AudioInboxPlugin extends Plugin {
    settings!: AudioInboxSettings; // Definite assignment assertion since we load in onload
    private logger = createLogger('Main');

    /**
     * Called when the plugin is loaded
     */
    async onload() {
        this.logger.info('Audio Inbox Plugin v1.2 loaded!');
        
        // Load settings
        await this.loadSettings();
        
        // Log initialization info
        this.logger.info('Plugin initialization started');
        this.logger.debug('Settings loaded:', {
            hasModelsConfig: !!this.settings.modelsConfig,
            hasPipelineConfig: !!this.settings.pipelineConfig,
            hasParseModelsConfig: !!this.settings.parsedModelsConfig,
            hasParsedPipelineConfig: !!this.settings.parsedPipelineConfig,
            debugMode: this.settings.debugMode
        });
        this.logger.debug('Build-time log level:', getBuildLogLevel());
        
        // Add ribbon icon
        this.addRibbonIcon('microphone', 'Audio Inbox', () => {
            this.logger.info('Audio Inbox ribbon clicked');
            const configStatus = this.getConfigurationStatus();
            this.showNotice(`Audio Inbox ready! Configuration: ${configStatus}`);
        });

        // Register commands
        this.addCommand({
            id: 'process-next-file',
            name: 'Process Next File',
            callback: () => this.processNextFileCommand()
        });

        // Register settings tab
        this.addSettingTab(new AudioInboxSettingTab(this.app, this));

        this.logger.info('Audio Inbox Plugin v1.2 initialization complete');
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
            
            // Check if both configurations are available and valid
            const configStatus = this.validateConfigurations();
            if (!configStatus.isValid) {
                this.showNotice(`❌ Configuration invalid: ${configStatus.error}. Please check settings.`, 8000);
                this.logger.error('Configuration validation failed:', configStatus.error);
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
                    this.showNotice('ℹ️ No files found to process. Place audio files in inbox/audio/ folder.', 6000);
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
     * Load plugin settings from disk with v1.2 dual configuration support
     */
    async loadSettings() {
        try {
            const loadedData = await this.loadData();
            this.settings = Object.assign({}, DEFAULT_SETTINGS, loadedData);
            
            // Update last saved timestamp and version
            this.settings.lastSaved = new Date().toISOString();
            this.settings.version = this.manifest.version;
            
            // Ensure we have both configurations
            if (!this.settings.modelsConfig || this.settings.modelsConfig === '{}') {
                this.settings.modelsConfig = JSON.stringify(DEFAULT_MODELS_CONFIG, null, 2);
                this.logger.info('Initialized with default models configuration');
            }
            
            if (!this.settings.pipelineConfig || this.settings.pipelineConfig === '{}') {
                this.settings.pipelineConfig = JSON.stringify(DEFAULT_PIPELINE_CONFIG, null, 2);
                this.logger.info('Initialized with default pipeline configuration');
            }
            
            // Parse and validate configurations
            this.parseConfigurations();
            
            // Save if we made any changes
            if (!loadedData || !loadedData.modelsConfig || !loadedData.pipelineConfig) {
                await this.saveSettings();
            }
            
            this.logger.info('Settings loaded successfully');
        } catch (error) {
            this.logger.error('Failed to load settings, using defaults:', error);
            this.settings = Object.assign({}, DEFAULT_SETTINGS);
            this.settings.lastSaved = new Date().toISOString();
            this.settings.version = this.manifest.version;
            this.parseConfigurations();
        }
    }

    /**
     * Parse both configurations and store parsed versions
     */
    private parseConfigurations(): void {
        try {
            // Validate and parse both configurations using ConfigurationResolver
            const resolver = createConfigurationResolver(
                this.settings.modelsConfig,
                this.settings.pipelineConfig
            );
            
            const validationResult = resolver.validate();
            
            if (validationResult.isValid) {
                this.settings.parsedModelsConfig = JSON.parse(this.settings.modelsConfig) as ModelsConfig;
                this.settings.parsedPipelineConfig = JSON.parse(this.settings.pipelineConfig) as PipelineConfiguration;
                this.logger.debug('Both configurations parsed and validated successfully');
            } else {
                this.logger.warn('Configuration validation failed, clearing parsed configs:', validationResult);
                this.settings.parsedModelsConfig = undefined;
                this.settings.parsedPipelineConfig = undefined;
            }
        } catch (error) {
            this.logger.error('Failed to parse configurations:', error);
            this.settings.parsedModelsConfig = undefined;
            this.settings.parsedPipelineConfig = undefined;
        }
    }

    /**
     * Validate current configurations
     */
    private validateConfigurations(): { isValid: boolean; error?: string } {
        if (!this.settings.parsedModelsConfig) {
            return { isValid: false, error: 'Models configuration not parsed' };
        }
        
        if (!this.settings.parsedPipelineConfig) {
            return { isValid: false, error: 'Pipeline configuration not parsed' };
        }
        
        try {
            const resolver = createConfigurationResolver(
                this.settings.modelsConfig,
                this.settings.pipelineConfig
            );
            
            const validationResult = resolver.validate();
            
            if (!validationResult.isValid) {
                const errorSections = [];
                if (validationResult.modelsErrors.length > 0) {
                    errorSections.push(`Models: ${validationResult.modelsErrors.length} errors`);
                }
                if (validationResult.pipelineErrors.length > 0) {
                    errorSections.push(`Pipeline: ${validationResult.pipelineErrors.length} errors`);
                }
                if (validationResult.crossRefErrors.length > 0) {
                    errorSections.push(`Cross-ref: ${validationResult.crossRefErrors.length} errors`);
                }
                
                return { isValid: false, error: errorSections.join(', ') };
            }
            
            return { isValid: true };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return { isValid: false, error: errorMessage };
        }
    }

    /**
     * Get configuration status for display
     */
    private getConfigurationStatus(): string {
        const validationResult = this.validateConfigurations();
        
        if (validationResult.isValid) {
            const stepCount = this.settings.parsedPipelineConfig ? Object.keys(this.settings.parsedPipelineConfig).length : 0;
            return `Valid (${stepCount} steps)`;
        } else {
            return `Invalid (${validationResult.error})`;
        }
    }

    /**
     * Save plugin settings to disk
     */
    async saveSettings() {
        try {
            // Update timestamp before saving
            this.settings.lastSaved = new Date().toISOString();
            
            // Parse configurations before saving to ensure consistency
            this.parseConfigurations();
            
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
     * Get parsed models configuration (type-safe)
     */
    public getModelsConfiguration(): ModelsConfig | undefined {
        return this.settings.parsedModelsConfig;
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