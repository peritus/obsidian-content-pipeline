import { App, PluginSettingTab, Notice } from 'obsidian';
import ContentPipelinePlugin from '../../main';
import { FileOperations } from '../../core/file-operations';
import { ModelsConfigSection } from '../ModelsConfigSection';
import { OpenAIApiKeySection } from '../OpenAIApiKeySection';
import { PipelineConfigSection } from '../PipelineConfigSection';
import { ImportExportManager, ImportExportCallbacks } from '../ImportExportManager';
import { PipelineVisualization } from '../PipelineVisualization';
import { FolderSetupSection } from '../folder-setup-section';
import { ExamplePromptsManager } from './ExamplePromptsManager';
import { createConfigurationResolver } from '../../validation/configuration-resolver';
import { ConfigValidationResult } from '../../types';

/**
 * Settings tab for the Content Pipeline plugin
 */
export class SettingsTab extends PluginSettingTab {
    plugin: ContentPipelinePlugin;
    private fileOps: FileOperations;
    private examplePromptsManager: ExamplePromptsManager;
    private debounceTimer: NodeJS.Timeout | null = null;

    // Components
    private openAISection: OpenAIApiKeySection;
    private modelsSection: ModelsConfigSection;
    private pipelineSection: PipelineConfigSection;
    private importExportManager: ImportExportManager;
    private pipelineVisualization: PipelineVisualization;

    constructor(app: App, plugin: ContentPipelinePlugin) {
        super(app, plugin);
        this.plugin = plugin;
        this.fileOps = new FileOperations(app);
        this.examplePromptsManager = new ExamplePromptsManager(app);

        // Create import/export callbacks
        const importExportCallbacks: ImportExportCallbacks = {
            onPipelineImport: (config) => this.handlePipelineImport(config),
            onExamplePromptsImport: (prompts) => this.handleExamplePromptsImport(prompts)
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
        this.importExportManager = new ImportExportManager(importExportCallbacks);
        this.pipelineVisualization = new PipelineVisualization();
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        // Example Prompts Setup Section (moved above configuration sections)
        // Initialize with imported prompts if available
        this.examplePromptsManager.setImportedPrompts(this.plugin.settings.importedExamplePrompts);
        this.examplePromptsManager.render(containerEl);

        // Configuration sections
        this.openAISection.render(containerEl);
        this.modelsSection.render(containerEl);
        this.pipelineSection.render(containerEl);

        // Pipeline visualization
        this.pipelineVisualization.render(containerEl);

        // Control buttons
        this.renderControlButtons(containerEl);

        // Folder Setup Section
        const folderSection = new FolderSetupSection(this.plugin, this.fileOps);
        folderSection.render(containerEl);

        // Initial validation
        this.validateAndUpdate();
    }

    /**
     * Handle pipeline configuration import
     */
    private handlePipelineImport(config: string): void {
        this.pipelineSection.setValue(config);
        this.handlePipelineConfigChange(config);
    }

    /**
     * Handle example prompts import
     */
    private async handleExamplePromptsImport(prompts: Record<string, string>): Promise<void> {
        // Store imported prompts in settings
        this.plugin.settings.importedExamplePrompts = prompts;
        
        // Update the example prompts manager
        this.examplePromptsManager.setImportedPrompts(prompts);
        
        // Save settings immediately to persist the imported prompts
        try {
            await this.plugin.saveSettings();
        } catch (error) {
            console.error('Failed to save imported example prompts:', error);
            new Notice('Warning: Failed to save imported example prompts', 5000);
        }
    }



    /**
     * Render control buttons section (inlined from ControlButtons)
     */
    private renderControlButtons(containerEl: HTMLElement): void {
        const buttonContainer = containerEl.createEl('div', { cls: 'content-pipeline-button-container' });

        // Validate configuration button
        const validateBtn = buttonContainer.createEl('button', { text: 'Validate Configuration' });
        validateBtn.onclick = () => this.validateAndUpdate(true);

        // Create initial folders button
        const createFoldersBtn = buttonContainer.createEl('button', { text: 'Create Initial Folders' });
        createFoldersBtn.onclick = () => this.createInitialFolders();
    }

    /**
     * Handle models configuration changes with debouncing and auto-save
     */
    private handleModelsConfigChange(value: string): void {
        this.plugin.settings.modelsConfig = value;
        
        // Refresh the OpenAI section to update its summary and status
        this.openAISection.refresh();
        
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
        const validationResult = this.validateConfigurations();
        this.pipelineVisualization.update(
            this.plugin.settings.modelsConfig,
            this.plugin.settings.pipelineConfig
        );

        if (validationResult.isValid) {
            await this.saveValidConfiguration(validationResult);
        } else {
            this.clearParsedConfigurations();
        }
    }

    /**
     * Perform comprehensive validation of both configurations
     */
    private validateAndUpdate(showNotice: boolean = false): void {
        const validationResult = this.validateConfigurations();
        this.pipelineVisualization.update(
            this.plugin.settings.modelsConfig,
            this.plugin.settings.pipelineConfig
        );

        if (showNotice) {
            if (validationResult.isValid) {
                new Notice('✅ Configuration is valid!', 3000);
            } else {
                this.showValidationError(validationResult);
            }
        }

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
            const resolver = createConfigurationResolver(
                this.plugin.settings.modelsConfig,
                this.plugin.settings.pipelineConfig
            );
            return resolver.validate();
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
     * Show validation error with detailed information
     */
    private showValidationError(validationResult: ConfigValidationResult): void {
        const errorSections = [];
        
        if (validationResult.modelsErrors.length > 0) {
            errorSections.push(`Models: ${validationResult.modelsErrors.join('; ')}`);
        }
        
        if (validationResult.pipelineErrors.length > 0) {
            errorSections.push(`Pipeline: ${validationResult.pipelineErrors.join('; ')}`);
        }
        
        if (validationResult.crossRefErrors.length > 0) {
            errorSections.push(`Cross-reference: ${validationResult.crossRefErrors.join('; ')}`);
        }
        
        if (validationResult.outputRoutingErrors.length > 0) {
            errorSections.push(`Output routing: ${validationResult.outputRoutingErrors.join('; ')}`);
        }
        
        const message = errorSections.length > 0 
            ? `❌ Configuration errors: ${errorSections.join(' | ')}`
            : '❌ Configuration validation failed';
            
        new Notice(message, 8000);
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

    /**
     * Create initial folder structure (inlined from ControlButtons)
     */
    private async createInitialFolders(): Promise<void> {
        const validationResult = this.validateConfigurations();

        if (!validationResult.isValid) {
            this.showValidationError(validationResult);
            return;
        }

        try {
            const resolver = createConfigurationResolver(
                this.plugin.settings.modelsConfig,
                this.plugin.settings.pipelineConfig
            );

            const entryPoints = resolver.findEntryPoints();
            let foldersCreated = 0;

            for (const stepId of entryPoints) {
                const resolvedStep = resolver.resolveStep(stepId);
                const inputPath = resolvedStep.input;
                
                if (!(await this.plugin.app.vault.adapter.exists(inputPath))) {
                    await this.plugin.app.vault.createFolder(inputPath);
                    foldersCreated++;
                }
            }

            new Notice(`Created ${foldersCreated} initial folders for entry points`, 3000);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            new Notice(`Failed to create folders: ${errorMessage}`, 6000);
        }
    }
}
