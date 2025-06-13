import { Setting, TextAreaComponent } from 'obsidian';
import AudioInboxPlugin from '../main';
import { ConfigurationHelp } from './configuration-help';
import { ConfigurationValidator } from './configuration-validator';
import { ConfigurationButtons } from './configuration-buttons';
import { TextareaStyler } from './textarea-styler';

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
            .setDesc('Edit the complete pipeline configuration. Add your OpenAI API keys to the "apiKey" fields.');

        // Style the setting for full width
        TextareaStyler.styleSettingElement(configSetting.settingEl);
        
        configSetting.addTextArea(text => {
            this.configTextarea = text;
            
            // Apply full width styling
            TextareaStyler.styleTextarea(text);
            
            // Set current value
            text.setValue(this.plugin.settings.pipelineConfig);
            
            // Handle changes
            text.onChange(async (value) => {
                await this.handleConfigChange(value);
            });
            
            return text;
        });

        // Create button container and add control buttons
        const controlContainer = ConfigurationButtons.createButtonContainer(containerEl);
        ConfigurationButtons.addButtons(controlContainer, this.configTextarea, this.handleConfigChange.bind(this));

        // Configuration help
        ConfigurationHelp.render(containerEl);
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
