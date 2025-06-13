import { Setting, Notice, TextAreaComponent } from 'obsidian';
import AudioInboxPlugin from '../main';
import { DEFAULT_PIPELINE_CONFIG } from './default-config';
import { ConfigurationHelp } from './configuration-help';
import { ConfigurationValidator } from './configuration-validator';

/**
 * Pipeline configuration section for settings
 */
export class PipelineConfigSection {
    private plugin: AudioInboxPlugin;
    private configTextarea: TextAreaComponent | null = null;
    private validationStatusEl: HTMLElement | null = null;

    constructor(plugin: AudioInboxPlugin) {
        this.plugin = plugin;
    }

    /**
     * Render the pipeline configuration section
     */
    render(containerEl: HTMLElement): void {
        // Section header
        containerEl.createEl('h3', { text: 'Pipeline Configuration' });
        
        // Create validation status display
        this.validationStatusEl = ConfigurationValidator.createStatusElement(containerEl);
        this.updateValidationStatus();

        // Editable JSON Configuration
        const configSetting = new Setting(containerEl)
            .setName('Pipeline Configuration (JSON)')
            .setDesc('Edit the complete pipeline configuration. Add your OpenAI API keys to the "apiKey" fields.')
            .addTextArea(text => {
                this.configTextarea = text;
                text.inputEl.style.width = '100%';
                text.inputEl.style.height = '400px';
                text.inputEl.style.fontFamily = 'monospace';
                text.inputEl.style.fontSize = '12px';
                text.inputEl.style.lineHeight = '1.4';
                text.inputEl.style.resize = 'vertical';
                
                // Set current value
                text.setValue(this.plugin.settings.pipelineConfig);
                
                // Handle changes
                text.onChange(async (value) => {
                    await this.handleConfigChange(value);
                });
                
                return text;
            });

        // Add control buttons
        this.addControlButtons(configSetting);

        // Configuration help
        ConfigurationHelp.render(containerEl);
    }

    /**
     * Add control buttons to the setting
     */
    private addControlButtons(configSetting: Setting): void {
        configSetting
            .addButton(button => button
                .setButtonText('Load Default')
                .setTooltip('Reset to default configuration')
                .onClick(async () => {
                    const defaultConfig = JSON.stringify(DEFAULT_PIPELINE_CONFIG, null, 2);
                    if (this.configTextarea) {
                        this.configTextarea.setValue(defaultConfig);
                        await this.handleConfigChange(defaultConfig);
                    }
                }))
            .addButton(button => button
                .setButtonText('Format JSON')
                .setTooltip('Auto-format the JSON configuration')
                .onClick(async () => {
                    if (this.configTextarea) {
                        try {
                            const current = this.configTextarea.getValue();
                            const parsed = JSON.parse(current);
                            const formatted = JSON.stringify(parsed, null, 2);
                            this.configTextarea.setValue(formatted);
                            await this.handleConfigChange(formatted);
                        } catch (error) {
                            new Notice('❌ Cannot format: Invalid JSON syntax', 4000);
                        }
                    }
                }))
            .addButton(button => button
                .setButtonText('Validate')
                .setTooltip('Check configuration for errors')
                .onClick(() => {
                    if (this.configTextarea) {
                        ConfigurationValidator.validate(this.configTextarea.getValue(), true);
                    }
                }));
    }

    /**
     * Handle configuration changes
     */
    private async handleConfigChange(value: string): Promise<void> {
        // Update the string version immediately
        this.plugin.settings.pipelineConfig = value;
        
        // Validate and update parsed version
        const isValid = ConfigurationValidator.validate(value, false);
        
        if (isValid) {
            try {
                this.plugin.settings.parsedPipelineConfig = JSON.parse(value);
            } catch (error) {
                // This shouldn't happen if validation passed, but just in case
                this.plugin.settings.parsedPipelineConfig = undefined;
            }
        } else {
            this.plugin.settings.parsedPipelineConfig = undefined;
        }
        
        // Save settings
        await this.plugin.saveSettings();
        
        // Update status display
        this.updateValidationStatus();
    }

    /**
     * Update the validation status display
     */
    private updateValidationStatus(): void {
        if (!this.validationStatusEl) return;

        const isValid = this.plugin.settings.parsedPipelineConfig !== undefined;
        const stepCount = isValid ? Object.keys(this.plugin.settings.parsedPipelineConfig!).length : undefined;
        
        ConfigurationValidator.updateStatus(this.validationStatusEl, isValid, stepCount);
    }
}
