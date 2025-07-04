import { Plugin, Notice, TFile } from 'obsidian';
import { DEFAULT_SETTINGS, SettingsTab } from './settings';
import { ContentPipelineSettings, PipelineConfiguration, ModelsConfig } from './types';
import { createLogger, getBuildLogLevel } from './logger';
import { validateConfig, parseAndValidateConfig, isValidConfig, getConfigErrors } from './validation';
import { CommandHandler } from './commands';

/**
 * Main plugin class for Content Pipeline
 */
export default class ContentPipelinePlugin extends Plugin {
    settings!: ContentPipelineSettings; // Definite assignment assertion since we load in onload
    private logger = createLogger('Main');
    private commandHandler!: CommandHandler;

    /**
     * Called when the plugin is loaded
     */
    async onload() {
        this.logger.info('Content Pipeline Plugin loaded!');
        
        // Load settings
        await this.loadSettings();
        
        // Initialize command handler
        this.commandHandler = new CommandHandler(this.app, this.settings);
        
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
        this.addRibbonIcon('microphone', 'Content Pipeline', () => {
            this.logger.info('Content Pipeline ribbon clicked');
            const configStatus = this.getConfigurationStatus();
            new Notice(`Content Pipeline ready! Configuration: ${configStatus}`);
        });

        // Register file menu integration
        this.registerFileMenuIntegration();

        // Register commands
        this.addCommand({
            id: 'process-next-file',
            name: 'Process Next File',
            callback: () => this.commandHandler.processNextFile()
        });

        this.addCommand({
            id: 'process-all-files',
            name: 'Process All Files',
            callback: () => this.commandHandler.processAllFiles()
        });

        // Register settings tab
        this.addSettingTab(new SettingsTab(this.app, this));

        this.logger.info('Content Pipeline Plugin initialization complete');
    }

    /**
     * Called when the plugin is unloaded
     */
    onunload() {
        this.logger.info('Content Pipeline Plugin unloaded');
    }

    /**
     * Register file menu integration for processing individual files
     */
    private registerFileMenuIntegration(): void {
        this.registerEvent(
            this.app.workspace.on('file-menu', (menu, file) => {
                // Only process TFile instances
                if (!(file instanceof TFile)) return;

                // Check if file can be processed using the synchronous discovery system
                try {
                    const canProcess = this.commandHandler.canFileBeProcessedSync(file);
                    if (!canProcess) return;

                    // Get the step that would process this file for dynamic title
                    const stepId = this.getStepForFile(file);
                    const menuTitle = stepId 
                        ? `Apply [${stepId}] to this file.`
                        : 'Process File with Content Pipeline 🎵';

                    // Add menu item for processable files
                    menu.addItem((item) => {
                        item
                            .setTitle(menuTitle)
                            .setIcon('microphone')
                            .onClick(async () => {
                                await this.commandHandler.processSpecificFile(file);
                            });
                    });
                } catch (error) {
                    this.logger.warn('Error checking if file can be processed for menu:', error);
                }
            })
        );

        this.logger.debug('File menu integration registered');
    }

    /**
     * Get the step that would process a specific file (synchronous)
     */
    private getStepForFile(file: TFile): string | null {
        try {
            const pipelineConfig = this.getPipelineConfiguration();
            if (!pipelineConfig) return null;

            const { FileDiscovery } = require('./core/file-operations');
            const fileDiscovery = new FileDiscovery(this.app);
            return fileDiscovery.findStepForFileSync(file, pipelineConfig);
        } catch (error) {
            this.logger.warn('Error finding step for file:', error);
            return null;
        }
    }

    /**
     * Load plugin settings from disk with no automatic configuration initialization
     */
    async loadSettings() {
        try {
            const loadedData = await this.loadData();
            this.settings = Object.assign({}, DEFAULT_SETTINGS, loadedData);
            
            // Update last saved timestamp and version
            this.settings.lastSaved = new Date().toISOString();
            this.settings.version = this.manifest.version;
            
            // Parse and validate configurations (if any exist)
            this.parseConfigurations();
            
            // Save settings (but don't initialize with defaults)
            await this.saveSettings();
            
            this.logger.info('Settings loaded successfully');
        } catch (error) {
            this.logger.error('Failed to load settings, using empty defaults:', error);
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
            // Check if we have both configurations
            if (!this.settings.modelsConfig || !this.settings.pipelineConfig) {
                this.logger.debug('Missing configurations, clearing parsed configs');
                this.settings.parsedModelsConfig = undefined;
                this.settings.parsedPipelineConfig = undefined;
                return;
            }

            // Parse and validate configurations
            const { modelsConfig, pipelineConfig } = parseAndValidateConfig(
                this.settings.modelsConfig,
                this.settings.pipelineConfig
            );
            
            this.settings.parsedModelsConfig = modelsConfig;
            this.settings.parsedPipelineConfig = pipelineConfig;
            this.logger.debug('Both configurations parsed and validated successfully');
            
        } catch (error) {
            this.logger.error('Failed to parse configurations:', error);
            this.settings.parsedModelsConfig = undefined;
            this.settings.parsedPipelineConfig = undefined;
        }
    }

    /**
     * Get configuration status for display
     */
    private getConfigurationStatus(): string {
        if (!this.settings.parsedModelsConfig || !this.settings.parsedPipelineConfig) {
            return 'Invalid configuration';
        }

        try {
            validateConfig(this.settings.parsedModelsConfig, this.settings.parsedPipelineConfig);
            const stepCount = Object.keys(this.settings.parsedPipelineConfig).length;
            return `Valid (${stepCount} steps)`;
        } catch (error) {
            const errors = getConfigErrors(this.settings.parsedModelsConfig, this.settings.parsedPipelineConfig);
            return `Invalid (${errors.length} errors)`;
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
            
            // Update command handler with new settings
            this.commandHandler = new CommandHandler(this.app, this.settings);
            
            await this.saveData(this.settings);
            this.logger.info('Settings saved successfully');
        } catch (error) {
            this.logger.error('Failed to save settings:', error);
            throw error;
        }
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
