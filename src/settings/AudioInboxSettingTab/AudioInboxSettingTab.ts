import { App, PluginSettingTab, Notice } from 'obsidian';
import AudioInboxPlugin from '../../main';
import { FileOperations } from '../../core/file-operations';
import { ModelsConfigSection } from '../ModelsConfigSection';
import { PipelineConfigSection } from '../PipelineConfigSection';
import { ImportExportManager } from '../ImportExportManager';
import { PipelineVisualization } from '../PipelineVisualization';
import { FolderSetupSection } from '../folder-setup-section';
import { ExamplePromptsManager } from './ExamplePromptsManager';
import { GettingStartedRenderer } from './getting-started-renderer';
import { createConfigurationResolver } from '../../validation/configuration-resolver';
import { ConfigValidationResult } from '../../types';

/**
 * Settings tab for the Audio Inbox plugin
 */
export class AudioInboxSettingTab extends PluginSettingTab {
    plugin: AudioInboxPlugin;
    private fileOps: FileOperations;
    private examplePromptsManager: ExamplePromptsManager;
    private debounceTimer: NodeJS.Timeout | null = null;

    // Components
    private modelsSection: ModelsConfigSection;
    private pipelineSection: PipelineConfigSection;
    private importExportManager: ImportExportManager;
    private pipelineVisualization: PipelineVisualization;
    private statusEl: HTMLElement | null = null;

    constructor(app: App, plugin: AudioInboxPlugin) {
        super(app, plugin);
        this.plugin = plugin;
        this.fileOps = new FileOperations(app);
        this.examplePromptsManager = new ExamplePromptsManager(app);

        // Initialize components
        this.modelsSection = new ModelsConfigSection(plugin, (value) => this.handleModelsConfigChange(value));
        this.pipelineSection = new PipelineConfigSection(
            plugin,
            (value) => this.handlePipelineConfigChange(value),
            () => this.exportPipelineConfig(),
            () => this.importPipelineConfig()
        );
        this.importExportManager = new ImportExportManager((config) => {
            this.pipelineSection.setValue(config);
            this.handlePipelineConfigChange(config);
        });
        this.pipelineVisualization = new PipelineVisualization();
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        // Header
        containerEl.createEl('h2', { text: 'Audio Inbox Settings' });

        // Description
        this.renderDescription(containerEl);

        // Validation status display
        this.renderValidationStatus(containerEl);

        // Configuration sections
        this.modelsSection.render(containerEl);
        this.pipelineSection.render(containerEl);

        // Pipeline visualization
        this.pipelineVisualization.render(containerEl);

        // Control buttons
        this.renderControlButtons(containerEl);

        // Example Prompts Setup Section
        this.examplePromptsManager.render(containerEl);

        // Folder Setup Section
        const folderSection = new FolderSetupSection(this.plugin, this.fileOps);
        folderSection.render(containerEl);

        // Getting Started Section
        GettingStartedRenderer.render(containerEl);

        // Initial validation
        this.validateAndUpdate();
    }

    /**
     * Render description section (inlined from DescriptionRenderer)
     */
    private renderDescription(containerEl: HTMLElement): void {
        const descEl = containerEl.createEl('div');
        descEl.style.marginBottom = '20px';
        descEl.innerHTML = `
            <p style="margin-bottom: 10px;">
                Configure the Audio Inbox plugin using two separate configurations for security and sharing:
            </p>
            <ul style="margin-left: 20px; margin-bottom: 0;">
                <li><strong>Models Configuration:</strong> Private API credentials and model settings (never shared)</li>
                <li><strong>Pipeline Configuration:</strong> Workflow logic that can be safely exported and shared</li>
            </ul>
            <div style="margin-top: 10px; padding: 10px; background-color: var(--background-secondary); border-radius: 4px; font-size: 14px; color: var(--text-muted);">
                💾 <strong>Auto-save enabled:</strong> Changes are automatically saved as you type after validation completes.
            </div>
        `;
    }

    /**
     * Render validation status section (inlined from ValidationStatusDisplay)
     */
    private renderValidationStatus(containerEl: HTMLElement): void {
        this.statusEl = containerEl.createEl('div');
        this.statusEl.style.marginBottom = '15px';
        this.statusEl.style.padding = '15px';
        this.statusEl.style.borderRadius = '6px';
        this.statusEl.style.border = '1px solid var(--background-modifier-border)';
        this.statusEl.style.fontSize = '14px';
    }

    /**
     * Render control buttons section (inlined from ControlButtons)
     */
    private renderControlButtons(containerEl: HTMLElement): void {
        const buttonContainer = containerEl.createEl('div');
        buttonContainer.style.marginTop = '20px';
        buttonContainer.style.marginBottom = '20px';
        buttonContainer.style.display = 'flex';
        buttonContainer.style.gap = '10px';
        buttonContainer.style.flexWrap = 'wrap';

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
        this.updateValidationDisplay(validationResult);
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
        this.updateValidationDisplay(validationResult);
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
                warnings: [],
                entryPoints: []
            };
        }
    }

    /**
     * Update validation status display (inlined logic)
     */
    private updateValidationDisplay(validationResult: ConfigValidationResult): void {
        if (!this.statusEl) return;

        if (validationResult.isValid) {
            this.statusEl.style.backgroundColor = '#d4edda';
            this.statusEl.style.borderColor = '#c3e6cb';
            this.statusEl.style.color = '#155724';
            
            const entryPointsText = validationResult.entryPoints.length > 0 
                ? ` | Entry points: ${validationResult.entryPoints.join(', ')}`
                : '';
            
            this.statusEl.innerHTML = `
                <div style="font-weight: bold; margin-bottom: 5px;">✅ Configuration Valid</div>
                <div style="font-size: 13px; opacity: 0.9;">
                    Ready for processing${entryPointsText}
                </div>
            `;
        } else {
            this.statusEl.style.backgroundColor = '#f8d7da';
            this.statusEl.style.borderColor = '#f5c6cb';
            this.statusEl.style.color = '#721c24';
            
            const errorDetails = [];
            if (validationResult.modelsErrors.length > 0) {
                errorDetails.push(`Models: ${validationResult.modelsErrors.length} error(s)`);
            }
            if (validationResult.pipelineErrors.length > 0) {
                errorDetails.push(`Pipeline: ${validationResult.pipelineErrors.length} error(s)`);
            }
            if (validationResult.crossRefErrors.length > 0) {
                errorDetails.push(`References: ${validationResult.crossRefErrors.length} error(s)`);
            }
            
            const allErrors = [
                ...validationResult.modelsErrors,
                ...validationResult.pipelineErrors,
                ...validationResult.crossRefErrors
            ];
            
            this.statusEl.innerHTML = `
                <div style="font-weight: bold; margin-bottom: 8px;">❌ Configuration Invalid</div>
                <div style="font-size: 13px; margin-bottom: 8px;">
                    ${errorDetails.join(' | ')}
                </div>
                <details style="font-size: 12px;">
                    <summary style="cursor: pointer; margin-bottom: 5px;">Show detailed errors</summary>
                    <ul style="margin: 5px 0 0 15px; padding: 0;">
                        ${allErrors.map(error => `<li style="margin-bottom: 3px;">${error}</li>`).join('')}
                    </ul>
                </details>
            `;
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