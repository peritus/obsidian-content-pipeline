/**
 * Dual configuration section for v1.2 split configuration system
 * 
 * Provides two separate textareas for models (private) and pipeline (shareable) configurations
 * with real-time validation, cross-reference checking, auto-save functionality, and export/import.
 */

import AudioInboxPlugin from '../../main';
import { ConfigurationHelp } from '../configuration-help';
import { DualConfigurationValidator } from '../dual-configuration-validator';
import { ModelsConfigSection } from './ModelsConfigSection';
import { PipelineConfigSection } from './PipelineConfigSection';
import { PipelineVisualization } from './PipelineVisualization';
import { ImportExportManager } from './ImportExportManager';
import { ValidationStatusDisplay } from './ValidationStatusDisplay';
import { ControlButtons } from './ControlButtons';
import { DescriptionRenderer } from './DescriptionRenderer';

/**
 * Dual configuration section for settings panel
 */
export class DualConfigSection {
    private plugin: AudioInboxPlugin;
    private validator: DualConfigurationValidator;
    private debounceTimer: NodeJS.Timeout | null = null;

    // Components
    private modelsConfigSection: ModelsConfigSection;
    private pipelineConfigSection: PipelineConfigSection;
    private pipelineVisualization: PipelineVisualization;
    private importExportManager: ImportExportManager;
    private validationStatusDisplay: ValidationStatusDisplay;
    private controlButtons: ControlButtons;

    constructor(plugin: AudioInboxPlugin) {
        this.plugin = plugin;
        this.validator = new DualConfigurationValidator();

        // Initialize components
        this.modelsConfigSection = new ModelsConfigSection(plugin, (value) => this.handleModelsConfigChange(value));
        this.pipelineConfigSection = new PipelineConfigSection(
            plugin,
            (value) => this.handlePipelineConfigChange(value),
            () => this.exportPipelineConfig(),
            () => this.importPipelineConfig()
        );
        this.pipelineVisualization = new PipelineVisualization(this.validator);
        this.importExportManager = new ImportExportManager(this.validator, (config) => {
            this.pipelineConfigSection.setValue(config);
            this.handlePipelineConfigChange(config);
        });
        this.validationStatusDisplay = new ValidationStatusDisplay();
        this.controlButtons = new ControlButtons(plugin, this.validator);
    }

    /**
     * Render the dual configuration section
     */
    render(containerEl: HTMLElement): void {
        // Section header
        containerEl.createEl('h3', { text: 'Audio Inbox Configuration' });
        
        // Create description
        DescriptionRenderer.render(containerEl);

        // Create validation status display
        this.validationStatusDisplay.render(containerEl);

        // Render configuration sections
        this.modelsConfigSection.render(containerEl);
        this.pipelineConfigSection.render(containerEl);

        // Create pipeline visualization
        this.pipelineVisualization.render(containerEl);

        // Create control buttons
        this.controlButtons.render(containerEl, () => this.performValidation(true));

        // Configuration help
        ConfigurationHelp.render(containerEl);

        // Initial validation
        this.performValidation();
    }

    /**
     * Handle models configuration changes with debouncing and auto-save
     */
    private handleModelsConfigChange(value: string): void {
        this.plugin.settings.modelsConfig = value;
        this.debounceValidationAndAutoSave();
    }

    /**
     * Handle pipeline configuration changes with debouncing and auto-save
     */
    private handlePipelineConfigChange(value: string): void {
        this.plugin.settings.pipelineConfig = value;
        this.debounceValidationAndAutoSave();
    }

    /**
     * Debounce validation and auto-save
     */
    private debounceValidationAndAutoSave(): void {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        
        this.debounceTimer = setTimeout(async () => {
            await this.performValidationAndAutoSave();
        }, 300);
    }

    /**
     * Perform validation and auto-save if configuration is valid
     */
    private async performValidationAndAutoSave(): Promise<void> {
        const validationResult = this.validator.validate(
            this.plugin.settings.modelsConfig,
            this.plugin.settings.pipelineConfig,
            false
        );

        this.updateDisplays(validationResult);

        if (validationResult.isValid) {
            await this.saveValidConfiguration(validationResult);
        } else {
            this.clearParsedConfigurations();
        }
    }

    /**
     * Perform comprehensive validation of both configurations (without auto-save)
     */
    private async performValidation(showNotice: boolean = false): Promise<void> {
        const validationResult = this.validator.validate(
            this.plugin.settings.modelsConfig,
            this.plugin.settings.pipelineConfig,
            showNotice
        );

        this.updateDisplays(validationResult);

        if (validationResult.isValid) {
            this.updateParsedConfigurations();
        } else {
            this.clearParsedConfigurations();
        }
    }

    /**
     * Update validation status and pipeline visualization displays
     */
    private updateDisplays(validationResult: any): void {
        this.validationStatusDisplay.update(validationResult);
        this.pipelineVisualization.update(
            validationResult,
            this.plugin.settings.modelsConfig,
            this.plugin.settings.pipelineConfig
        );
    }

    /**
     * Save valid configuration with auto-save
     */
    private async saveValidConfiguration(validationResult: any): Promise<void> {
        try {
            this.updateParsedConfigurations();
            this.plugin.settings.lastSaved = new Date().toISOString();
            await this.plugin.saveSettings();
            this.validationStatusDisplay.updateWithAutoSave(validationResult, true);
        } catch (error) {
            this.validationStatusDisplay.updateWithAutoSave(validationResult, false, error);
        }
    }

    /**
     * Update parsed configurations
     */
    private updateParsedConfigurations(): void {
        try {
            this.plugin.settings.parsedModelsConfig = JSON.parse(this.plugin.settings.modelsConfig);
            this.plugin.settings.parsedPipelineConfig = JSON.parse(this.plugin.settings.pipelineConfig);
        } catch (error) {
            this.clearParsedConfigurations();
        }
    }

    /**
     * Clear parsed configurations
     */
    private clearParsedConfigurations(): void {
        this.plugin.settings.parsedModelsConfig = undefined;
        this.plugin.settings.parsedPipelineConfig = undefined;
    }

    /**
     * Export pipeline configuration
     */
    private exportPipelineConfig(): void {
        this.importExportManager.exportPipelineConfig(
            this.plugin.settings.modelsConfig,
            this.plugin.settings.pipelineConfig
        );
    }

    /**
     * Import pipeline configuration
     */
    private importPipelineConfig(): void {
        this.importExportManager.importPipelineConfig();
    }
}