/**
 * Models configuration section - handles rendering and logic for models config textarea
 */

import { Setting, TextAreaComponent } from 'obsidian';
import ContentPipelinePlugin from '../main';
import { TextareaStyler } from './textarea-styler';
import { DEFAULT_MODELS_CONFIG } from './default-config';

export class ModelsConfigSection {
    private plugin: ContentPipelinePlugin;
    private modelsTextarea: TextAreaComponent | null = null;
    private onChangeCallback: (value: string) => void;

    constructor(plugin: ContentPipelinePlugin, onChangeCallback: (value: string) => void) {
        this.plugin = plugin;
        this.onChangeCallback = onChangeCallback;
    }

    /**
     * Render the models configuration section
     */
    render(containerEl: HTMLElement): void {
        // Models configuration header
        const modelsHeaderEl = containerEl.createEl('div', { cls: 'content-pipeline-section-header' });
        
        const modelsHeader = modelsHeaderEl.createEl('h4', { text: '🔐 Models Configuration (Private)' });
        
        const modelsDesc = modelsHeaderEl.createEl('div', { cls: 'content-pipeline-section-description' });
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
                this.onChangeCallback(value);
            });
            
            return text;
        });

        // Add default config button for models
        this.renderDefaultConfigButton(containerEl);
    }

    /**
     * Render the default config button
     */
    private renderDefaultConfigButton(containerEl: HTMLElement): void {
        const modelsButtonContainer = containerEl.createEl('div', { cls: 'content-pipeline-config-button-container' });
        
        const loadDefaultModelsBtn = modelsButtonContainer.createEl('button', { 
            text: 'Load Default Models Config',
            cls: 'content-pipeline-config-button'
        });
        loadDefaultModelsBtn.onclick = () => {
            const defaultConfig = JSON.stringify(DEFAULT_MODELS_CONFIG, null, 2);
            if (this.modelsTextarea) {
                this.modelsTextarea.setValue(defaultConfig);
                this.onChangeCallback(defaultConfig);
            }
        };
    }

    /**
     * Get the current textarea value
     */
    getValue(): string {
        return this.modelsTextarea?.getValue() || '';
    }

    /**
     * Set the textarea value
     */
    setValue(value: string): void {
        if (this.modelsTextarea) {
            this.modelsTextarea.setValue(value);
        }
    }
}
