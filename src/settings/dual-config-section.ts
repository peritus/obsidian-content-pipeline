/**
 * Dual configuration section for v1.2 split configuration system
 * 
 * Provides two separate textareas for models (private) and pipeline (shareable) configurations
 * with real-time validation, cross-reference checking, and export/import functionality.
 */

import { Setting, TextAreaComponent, DropdownComponent } from 'obsidian';
import AudioInboxPlugin from '../main';
import { ConfigurationHelp } from './configuration-help';
import { DualConfigurationValidator } from './dual-configuration-validator';
import { ConfigurationButtons } from './configuration-buttons';
import { TextareaStyler } from './textarea-styler';
import { DEFAULT_MODELS_CONFIG, DEFAULT_PIPELINE_CONFIG } from './default-config';

/**
 * Dual configuration section for settings panel
 */
export class DualConfigSection {
    private plugin: AudioInboxPlugin;
    private modelsTextarea: TextAreaComponent | null = null;
    private pipelineTextarea: TextAreaComponent | null = null;
    private validationStatusEl: HTMLElement | null = null;
    private pipelineVisualizationEl: HTMLElement | null = null;
    private validator: DualConfigurationValidator;
    private debounceTimer: NodeJS.Timeout | null = null;

    constructor(plugin: AudioInboxPlugin) {
        this.plugin = plugin;
        this.validator = new DualConfigurationValidator();
    }

    /**
     * Render the dual configuration section
     */
    render(containerEl: HTMLElement): void {
        // Section header
        containerEl.createEl('h3', { text: 'Audio Inbox Configuration' });
        
        // Create description
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
        `;

        // Create validation status display
        this.validationStatusEl = this.createValidationStatusElement(containerEl);

        // Render models configuration section
        this.renderModelsConfigSection(containerEl);

        // Render pipeline configuration section  
        this.renderPipelineConfigSection(containerEl);

        // Create pipeline visualization
        this.renderPipelineVisualization(containerEl);

        // Create control buttons
        this.renderControlButtons(containerEl);

        // Configuration help
        ConfigurationHelp.render(containerEl);

        // Initial validation
        this.performValidation();
    }

    /**
     * Render the models configuration section
     */
    private renderModelsConfigSection(containerEl: HTMLElement): void {
        // Models configuration header
        const modelsHeaderEl = containerEl.createEl('div');
        modelsHeaderEl.style.marginTop = '25px';
        modelsHeaderEl.style.marginBottom = '10px';
        
        const modelsHeader = modelsHeaderEl.createEl('h4', { text: '🔐 Models Configuration (Private)' });
        modelsHeader.style.marginBottom = '5px';
        
        const modelsDesc = modelsHeaderEl.createEl('div');
        modelsDesc.style.fontSize = '14px';
        modelsDesc.style.color = 'var(--text-muted)';
        modelsDesc.innerHTML = 'API keys, endpoints, and model specifications. <strong>Never share this configuration.</strong>';

        // Models configuration textarea
        const modelsSetting = new Setting(containerEl)
            .setName('Models Configuration (JSON)')
            .setDesc('Configure API credentials and model settings for each provider.');

        TextareaStyler.styleSettingElement(modelsSetting.settingEl);
        
        modelsSetting.addTextArea(text => {
            this.modelsTextarea = text;
            TextareaStyler.styleTextarea(text);
            text.setPlaceholder('{\n  "openai-gpt": {\n    "baseUrl": "https://api.openai.com/v1",\n    "apiKey": "your-api-key",\n    "implementation": "chatgpt",\n    "model": "gpt-4"\n  }\n}');
            text.setValue(this.plugin.settings.modelsConfig);
            
            text.onChange((value) => {
                this.handleModelsConfigChange(value);
            });
            
            return text;
        });

        // Add default config button for models
        const modelsButtonContainer = containerEl.createEl('div');
        modelsButtonContainer.style.marginTop = '10px';
        modelsButtonContainer.style.marginBottom = '15px';
        
        const loadDefaultModelsBtn = modelsButtonContainer.createEl('button', { text: 'Load Default Models Config' });
        loadDefaultModelsBtn.style.marginRight = '10px';
        loadDefaultModelsBtn.onclick = () => {
            const defaultConfig = JSON.stringify(DEFAULT_MODELS_CONFIG, null, 2);
            if (this.modelsTextarea) {
                this.modelsTextarea.setValue(defaultConfig);
                this.handleModelsConfigChange(defaultConfig);
            }
        };
    }

    /**
     * Render the pipeline configuration section
     */
    private renderPipelineConfigSection(containerEl: HTMLElement): void {
        // Pipeline configuration header
        const pipelineHeaderEl = containerEl.createEl('div');
        pipelineHeaderEl.style.marginTop = '25px';
        pipelineHeaderEl.style.marginBottom = '10px';
        
        const pipelineHeader = pipelineHeaderEl.createEl('h4', { text: '🔄 Pipeline Configuration (Shareable)' });
        pipelineHeader.style.marginBottom = '5px';
        
        const pipelineDesc = pipelineHeaderEl.createEl('div');
        pipelineDesc.style.fontSize = '14px';
        pipelineDesc.style.color = 'var(--text-muted)';
        pipelineDesc.innerHTML = 'Workflow logic and routing rules. <strong>Safe to export and share.</strong>';

        // Pipeline configuration textarea
        const pipelineSetting = new Setting(containerEl)
            .setName('Pipeline Configuration (JSON)')
            .setDesc('Configure workflow steps, routing logic, and file processing patterns.');

        TextareaStyler.styleSettingElement(pipelineSetting.settingEl);
        
        pipelineSetting.addTextArea(text => {
            this.pipelineTextarea = text;
            TextareaStyler.styleTextarea(text);
            text.setPlaceholder('{\n  "transcribe": {\n    "modelConfig": "openai-whisper",\n    "input": "inbox/audio",\n    "output": "inbox/transcripts/{filename}-transcript.md"\n  }\n}');
            text.setValue(this.plugin.settings.pipelineConfig);
            
            text.onChange((value) => {
                this.handlePipelineConfigChange(value);
            });
            
            return text;
        });

        // Add default config and export/import buttons for pipeline
        const pipelineButtonContainer = containerEl.createEl('div');
        pipelineButtonContainer.style.marginTop = '10px';
        pipelineButtonContainer.style.marginBottom = '15px';
        
        const loadDefaultPipelineBtn = pipelineButtonContainer.createEl('button', { text: 'Load Default Pipeline Config' });
        loadDefaultPipelineBtn.style.marginRight = '10px';
        loadDefaultPipelineBtn.onclick = () => {
            const defaultConfig = JSON.stringify(DEFAULT_PIPELINE_CONFIG, null, 2);
            if (this.pipelineTextarea) {
                this.pipelineTextarea.setValue(defaultConfig);
                this.handlePipelineConfigChange(defaultConfig);
            }
        };

        const exportBtn = pipelineButtonContainer.createEl('button', { text: 'Export Pipeline Config' });
        exportBtn.style.marginRight = '10px';
        exportBtn.onclick = () => this.exportPipelineConfig();

        const importBtn = pipelineButtonContainer.createEl('button', { text: 'Import Pipeline Config' });
        importBtn.onclick = () => this.importPipelineConfig();
    }

    /**
     * Render pipeline visualization section
     */
    private renderPipelineVisualization(containerEl: HTMLElement): void {
        const vizHeader = containerEl.createEl('h4', { text: '📊 Pipeline Visualization' });
        vizHeader.style.marginTop = '25px';
        vizHeader.style.marginBottom = '10px';

        this.pipelineVisualizationEl = containerEl.createEl('div');
        this.pipelineVisualizationEl.style.marginBottom = '20px';
        this.pipelineVisualizationEl.style.padding = '15px';
        this.pipelineVisualizationEl.style.backgroundColor = 'var(--background-secondary)';
        this.pipelineVisualizationEl.style.borderRadius = '6px';
        this.pipelineVisualizationEl.style.border = '1px solid var(--background-modifier-border)';
    }

    /**
     * Render control buttons section
     */
    private renderControlButtons(containerEl: HTMLElement): void {
        const buttonContainer = containerEl.createEl('div');
        buttonContainer.style.marginTop = '20px';
        buttonContainer.style.marginBottom = '20px';
        buttonContainer.style.display = 'flex';
        buttonContainer.style.gap = '10px';
        buttonContainer.style.flexWrap = 'wrap';

        // Save configuration button
        const saveBtn = buttonContainer.createEl('button', { text: 'Save Configuration' });
        saveBtn.style.backgroundColor = 'var(--interactive-accent)';
        saveBtn.style.color = 'var(--text-on-accent)';
        saveBtn.onclick = () => this.saveConfiguration();

        // Validate configuration button
        const validateBtn = buttonContainer.createEl('button', { text: 'Validate Configuration' });
        validateBtn.onclick = () => this.performValidation(true);

        // Create initial folders button
        const createFoldersBtn = buttonContainer.createEl('button', { text: 'Create Initial Folders' });
        createFoldersBtn.onclick = () => this.createInitialFolders();
    }

    /**
     * Handle models configuration changes with debouncing
     */
    private handleModelsConfigChange(value: string): void {
        // Update settings immediately
        this.plugin.settings.modelsConfig = value;
        
        // Debounce validation
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        
        this.debounceTimer = setTimeout(() => {
            this.performValidation();
        }, 300);
    }

    /**
     * Handle pipeline configuration changes with debouncing
     */
    private handlePipelineConfigChange(value: string): void {
        // Update settings immediately
        this.plugin.settings.pipelineConfig = value;
        
        // Debounce validation
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        
        this.debounceTimer = setTimeout(() => {
            this.performValidation();
        }, 300);
    }

    /**
     * Perform comprehensive validation of both configurations
     */
    private async performValidation(showNotice: boolean = false): Promise<void> {
        const validationResult = this.validator.validate(
            this.plugin.settings.modelsConfig,
            this.plugin.settings.pipelineConfig,
            showNotice
        );

        // Update validation status display
        this.updateValidationStatus(validationResult);

        // Update pipeline visualization
        this.updatePipelineVisualization(validationResult);

        // Update parsed configurations if valid
        if (validationResult.isValid) {
            try {
                this.plugin.settings.parsedModelsConfig = JSON.parse(this.plugin.settings.modelsConfig);
                this.plugin.settings.parsedPipelineConfig = JSON.parse(this.plugin.settings.pipelineConfig);
            } catch (error) {
                // Should not happen if validation passed, but handle gracefully
                this.plugin.settings.parsedModelsConfig = undefined;
                this.plugin.settings.parsedPipelineConfig = undefined;
            }
        } else {
            this.plugin.settings.parsedModelsConfig = undefined;
            this.plugin.settings.parsedPipelineConfig = undefined;
        }
    }

    /**
     * Save configuration
     */
    private async saveConfiguration(): Promise<void> {
        const validationResult = this.validator.validate(
            this.plugin.settings.modelsConfig,
            this.plugin.settings.pipelineConfig,
            false
        );

        if (!validationResult.isValid) {
            this.validator.showValidationError(validationResult);
            return;
        }

        try {
            // Update parsed configurations
            this.plugin.settings.parsedModelsConfig = JSON.parse(this.plugin.settings.modelsConfig);
            this.plugin.settings.parsedPipelineConfig = JSON.parse(this.plugin.settings.pipelineConfig);
            this.plugin.settings.lastSaved = new Date().toISOString();

            // Save settings
            await this.plugin.saveSettings();
            
            this.validator.showSuccessNotice('Configuration saved successfully!');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.validator.showErrorNotice(`Failed to save configuration: ${errorMessage}`);
        }
    }

    /**
     * Export pipeline configuration
     */
    private exportPipelineConfig(): void {
        try {
            const validationResult = this.validator.validate(
                this.plugin.settings.modelsConfig,
                this.plugin.settings.pipelineConfig,
                false
            );

            if (!validationResult.isValid) {
                this.validator.showValidationError(validationResult);
                return;
            }

            const resolver = this.validator.getConfigurationResolver(
                this.plugin.settings.modelsConfig,
                this.plugin.settings.pipelineConfig
            );

            const exportData = {
                version: '1.2',
                exported: new Date().toISOString(),
                description: 'Audio Inbox Pipeline Configuration',
                config: resolver.exportPipelineConfig()
            };

            const dataStr = JSON.stringify(exportData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = `audio-inbox-pipeline-${new Date().toISOString().split('T')[0]}.json`;
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            this.validator.showSuccessNotice('Pipeline configuration exported successfully!');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.validator.showErrorNotice(`Failed to export configuration: ${errorMessage}`);
        }
    }

    /**
     * Import pipeline configuration
     */
    private importPipelineConfig(): void {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = (event) => {
            const file = (event.target as HTMLInputElement).files?.[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const content = e.target?.result as string;
                    const importData = JSON.parse(content);
                    
                    // Validate import structure
                    if (!importData.config) {
                        throw new Error('Invalid import file - missing config section');
                    }

                    const configStr = JSON.stringify(importData.config, null, 2);
                    
                    if (this.pipelineTextarea) {
                        this.pipelineTextarea.setValue(configStr);
                        this.handlePipelineConfigChange(configStr);
                    }
                    
                    this.validator.showSuccessNotice('Pipeline configuration imported successfully!');
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    this.validator.showErrorNotice(`Failed to import configuration: ${errorMessage}`);
                }
            };
            
            reader.readAsText(file);
        };
        
        input.click();
    }

    /**
     * Create initial folder structure
     */
    private async createInitialFolders(): Promise<void> {
        const validationResult = this.validator.validate(
            this.plugin.settings.modelsConfig,
            this.plugin.settings.pipelineConfig,
            false
        );

        if (!validationResult.isValid) {
            this.validator.showValidationError(validationResult);
            return;
        }

        try {
            const resolver = this.validator.getConfigurationResolver(
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

            this.validator.showSuccessNotice(`Created ${foldersCreated} initial folders for entry points`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.validator.showErrorNotice(`Failed to create folders: ${errorMessage}`);
        }
    }

    /**
     * Create validation status element
     */
    private createValidationStatusElement(containerEl: HTMLElement): HTMLElement {
        const statusEl = containerEl.createEl('div');
        statusEl.style.marginBottom = '20px';
        statusEl.style.padding = '15px';
        statusEl.style.borderRadius = '6px';
        statusEl.style.border = '1px solid var(--background-modifier-border)';
        return statusEl;
    }

    /**
     * Update validation status display
     */
    private updateValidationStatus(validationResult: any): void {
        if (!this.validationStatusEl) return;

        if (validationResult.isValid) {
            this.validationStatusEl.style.backgroundColor = '#d4edda';
            this.validationStatusEl.style.borderColor = '#c3e6cb';
            this.validationStatusEl.style.color = '#155724';
            
            const entryPointsText = validationResult.entryPoints.length > 0 
                ? ` | Entry points: ${validationResult.entryPoints.join(', ')}`
                : '';
            
            this.validationStatusEl.innerHTML = `✅ <strong>Configuration Valid</strong>${entryPointsText}`;
        } else {
            this.validationStatusEl.style.backgroundColor = '#f8d7da';
            this.validationStatusEl.style.borderColor = '#f5c6cb';
            this.validationStatusEl.style.color = '#721c24';
            
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
            
            this.validationStatusEl.innerHTML = `❌ <strong>Configuration Invalid:</strong> ${errorSections.join(' | ')}`;
        }
    }

    /**
     * Update pipeline visualization
     */
    private updatePipelineVisualization(validationResult: any): void {
        if (!this.pipelineVisualizationEl) return;

        if (!validationResult.isValid) {
            this.pipelineVisualizationEl.innerHTML = '<em>Configuration must be valid to show pipeline visualization</em>';
            return;
        }

        try {
            const resolver = this.validator.getConfigurationResolver(
                this.plugin.settings.modelsConfig,
                this.plugin.settings.pipelineConfig
            );

            const pipelineConfig = JSON.parse(this.plugin.settings.pipelineConfig);
            const stepIds = Object.keys(pipelineConfig);
            
            let html = '<div style="margin-bottom: 15px;"><strong>Pipeline Overview:</strong></div>';
            
            // Entry points
            if (validationResult.entryPoints.length > 0) {
                html += `<div style="margin-bottom: 10px;"><strong>Entry Points:</strong> ${validationResult.entryPoints.join(', ')}</div>`;
            }
            
            // Steps table
            html += '<table style="width: 100%; border-collapse: collapse; font-size: 14px;">';
            html += '<tr style="background-color: var(--background-modifier-border);"><th style="padding: 8px; text-align: left; border: 1px solid var(--background-modifier-border);">Step</th><th style="padding: 8px; text-align: left; border: 1px solid var(--background-modifier-border);">Model</th><th style="padding: 8px; text-align: left; border: 1px solid var(--background-modifier-border);">Input</th><th style="padding: 8px; text-align: left; border: 1px solid var(--background-modifier-border);">Next Steps</th></tr>';
            
            stepIds.forEach(stepId => {
                const step = pipelineConfig[stepId];
                const nextSteps = step.next ? Object.keys(step.next).join(', ') : 'None';
                
                html += `<tr>
                    <td style="padding: 8px; border: 1px solid var(--background-modifier-border);">${stepId}</td>
                    <td style="padding: 8px; border: 1px solid var(--background-modifier-border);">${step.modelConfig}</td>
                    <td style="padding: 8px; border: 1px solid var(--background-modifier-border);">${step.input}</td>
                    <td style="padding: 8px; border: 1px solid var(--background-modifier-border);">${nextSteps}</td>
                </tr>`;
            });
            
            html += '</table>';
            
            this.pipelineVisualizationEl.innerHTML = html;
        } catch (error) {
            this.pipelineVisualizationEl.innerHTML = '<em>Error generating pipeline visualization</em>';
        }
    }
}