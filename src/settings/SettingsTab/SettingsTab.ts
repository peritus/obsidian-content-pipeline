import { App, PluginSettingTab, Notice, Setting } from 'obsidian';
import ContentPipelinePlugin from '../../main';
import { FileOperations } from '../../core/file-operations';
import { ModelsConfigSection } from '../ModelsConfigSection';
import { OpenAIApiKeySection } from '../OpenAIApiKeySection';
import { PipelineConfigSection } from '../PipelineConfigSection';
import { ImportExportManager, ImportExportCallbacks } from '../ImportExportManager';
import { FolderSetupSection } from '../folder-setup-section';
import { PromptsManager } from './PromptsManager';
import { getConfigErrors, isValidConfig } from '../../validation/config-validation';
import { parseAndValidateConfig } from '../../validation/config-resolver';
import { ConfigValidationResult } from '../../types';
import { SettingsNotifier } from '../settings-notifier';

/**
 * Settings tab for the Content Pipeline plugin
 */
export class SettingsTab extends PluginSettingTab {
    plugin: ContentPipelinePlugin;
    private fileOps: FileOperations;
    private promptsManager: PromptsManager;
    private debounceTimer: NodeJS.Timeout | null = null;
    private validationMessageEl: HTMLElement | null = null;
    private settingsNotifier: SettingsNotifier;

    // Components
    private openAISection: OpenAIApiKeySection;
    private modelsSection: ModelsConfigSection;
    private pipelineSection: PipelineConfigSection;
    private folderSection: FolderSetupSection;
    private importExportManager: ImportExportManager;

    constructor(app: App, plugin: ContentPipelinePlugin) {
        super(app, plugin);
        this.plugin = plugin;
        this.fileOps = new FileOperations(app);
        this.promptsManager = new PromptsManager(app);
        this.settingsNotifier = new SettingsNotifier();

        // Create import/export callbacks
        const importExportCallbacks: ImportExportCallbacks = {
            onPipelineImport: (config) => this.handlePipelineImport(config),
            onConfigPromptsImport: (prompts) => this.handleExamplePromptsImport(prompts)
        };

        // Initialize components
        this.openAISection = new OpenAIApiKeySection(plugin, (value) => this.handleModelsConfigChange(value));
        this.modelsSection = new ModelsConfigSection(plugin, (value) => this.handleModelsConfigChange(value));
        this.pipelineSection = new PipelineConfigSection(
            plugin,
            (value) => this.handlePipelineConfigChange(value),
            () => this.exportPipelineConfig(),
            () => this.importPipelineConfig()
        );
        this.folderSection = new FolderSetupSection(plugin, this.fileOps);
        this.importExportManager = new ImportExportManager(importExportCallbacks);

        // Set up cross-component notifications
        this.setupCrossComponentNotifications();
    }

    /**
     * Set up cross-component notifications
     */
    private setupCrossComponentNotifications(): void {
        // Subscribe to settings changes to keep components in sync
        this.settingsNotifier.subscribe((event) => {
            if (event.type === 'models' && event.modelsConfig !== undefined) {
                // Update models section (but only if the value is different to avoid loops)
                if (this.modelsSection.getValue() !== event.modelsConfig) {
                    this.modelsSection.setValue(event.modelsConfig);
                }
                // Update OpenAI section
                this.openAISection.refresh();
            }
            
            if (event.type === 'pipeline' && event.pipelineConfig !== undefined) {
                // Update pipeline section (but only if the value is different to avoid loops)
                if (this.pipelineSection.getValue() !== event.pipelineConfig) {
                    this.pipelineSection.setValue(event.pipelineConfig);
                }
                
                // Refresh folder section when pipeline config changes
                this.folderSection.refresh();
            }
        });
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        // Configuration Validation Section (at the very top)
        this.renderValidationSection(containerEl);

        // Configuration sections
        this.openAISection.render(containerEl);
        this.pipelineSection.render(containerEl);

        this.modelsSection.render(containerEl);

        // Folder Setup Section
        this.folderSection.render(containerEl);

        // Example Prompts Setup Section (moved above configuration sections)
        // Initialize with config-defined prompts if available
        this.promptsManager.setConfigDefinedPrompts(this.plugin.settings.configDefinedPrompts);
        this.promptsManager.render(containerEl);
    }

    /**
     * Handle pipeline configuration import
     */
    private handlePipelineImport(config: string): void {
        this.pipelineSection.setValue(config);
        this.handlePipelineConfigChange(config);
    }

    /**
     * Handle config-defined prompts import
     */
    private async handleExamplePromptsImport(prompts: Record<string, string>): Promise<void> {
        // Store config-defined prompts in settings
        this.plugin.settings.configDefinedPrompts = prompts;
        
        // Update the prompts manager
        this.promptsManager.setConfigDefinedPrompts(prompts);
        
        // Save settings immediately to persist the config-defined prompts
        try {
            await this.plugin.saveSettings();
        } catch (error) {
            console.error('Failed to save config-defined prompts:', error);
            new Notice('Warning: Failed to save config-defined prompts', 5000);
        }
    }



    /**
     * Render validation section at the top
     */
    private renderValidationSection(containerEl: HTMLElement): void {
        // Create the validation section
        const validationSection = containerEl.createEl('div', { cls: 'content-pipeline-validation-section' });
        
        // Validation message (instead of button)
        this.validationMessageEl = validationSection.createEl('div', { 
            cls: 'content-pipeline-validation-message'
        });
        
        // Set initial message
        this.updateValidationMessage();
    }

    /**
     * Update the validation message based on current configuration state
     */
    private updateValidationMessage(): void {
        if (!this.validationMessageEl) return;
        
        const validationResult = this.validateConfigurations();
        
        if (validationResult.isValid) {
            this.validationMessageEl.textContent = '✅ Configuration is valid';
            this.validationMessageEl.className = 'content-pipeline-validation-message valid';
        } else {
            // Collect all errors for the message
            const allErrors = [
                ...validationResult.modelsErrors,
                ...validationResult.pipelineErrors,
                ...validationResult.crossRefErrors,
                ...validationResult.outputRoutingErrors
            ];
            
            if (allErrors.length > 0) {
                // Show the first error as the main message
                this.validationMessageEl.textContent = `❌ ${allErrors[0]}`;
                if (allErrors.length > 1) {
                    this.validationMessageEl.title = `${allErrors.length} errors: ${allErrors.join('; ')}`;
                }
            } else {
                this.validationMessageEl.textContent = '❌ Configuration validation failed';
            }
            this.validationMessageEl.className = 'content-pipeline-validation-message invalid';
        }
    }



    /**
     * Handle models configuration changes with debouncing and auto-save
     */
    private handleModelsConfigChange(value: string): void {
        this.plugin.settings.modelsConfig = value;
        
        // Notify other components through the notifier system
        this.settingsNotifier.notifyModelsChange(value);
        
        this.debounceValidationAndAutoSave();
    }

    /**
     * Handle pipeline configuration changes with debouncing and auto-save
     */
    private handlePipelineConfigChange(value: string): void {
        this.plugin.settings.pipelineConfig = value;
        
        // Notify other components through the notifier system  
        this.settingsNotifier.notifyPipelineChange(value);
        
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
        const validationResult = this.validateConfigurations();

        // Update the validation message
        this.updateValidationMessage();

        if (validationResult.isValid) {
            await this.saveValidConfiguration(validationResult);
        } else {
            this.clearParsedConfigurations();
        }
    }

    /**
     * Perform comprehensive validation of both configurations
     */
    private validateAndUpdate(): void {
        const validationResult = this.validateConfigurations();

        // Update the validation message
        this.updateValidationMessage();

        if (validationResult.isValid) {
            this.updateParsedConfigurations();
        } else {
            this.clearParsedConfigurations();
        }
    }

    /**
     * Validate both configurations
     */
    private validateConfigurations(): ConfigValidationResult {
        try {
            const { modelsConfig, pipelineConfig } = parseAndValidateConfig(
                this.plugin.settings.modelsConfig,
                this.plugin.settings.pipelineConfig
            );
            
            const errors = getConfigErrors(modelsConfig, pipelineConfig);
            
            if (errors.length === 0) {
                return {
                    isValid: true,
                    modelsErrors: [],
                    pipelineErrors: [],
                    crossRefErrors: [],
                    outputRoutingErrors: [],
                    warnings: [],
                    entryPoints: []
                };
            } else {
                return {
                    isValid: false,
                    modelsErrors: [],
                    pipelineErrors: errors,
                    crossRefErrors: [],
                    outputRoutingErrors: [],
                    warnings: [],
                    entryPoints: []
                };
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return {
                isValid: false,
                modelsErrors: [],
                pipelineErrors: [],
                crossRefErrors: [errorMessage],
                outputRoutingErrors: [],
                warnings: [],
                entryPoints: []
            };
        }
    }

    /**
     * Save valid configuration with auto-save
     */
    private async saveValidConfiguration(validationResult: ConfigValidationResult): Promise<void> {
        try {
            this.updateParsedConfigurations();
            this.plugin.settings.lastSaved = new Date().toISOString();
            await this.plugin.saveSettings();
        } catch (error) {
            // Handle save error silently for auto-save
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
