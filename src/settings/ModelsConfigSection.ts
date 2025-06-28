/**
 * Models configuration section - OPTION 1: Button-based expand/collapse
 */

import { Setting, TextAreaComponent } from 'obsidian';
import ContentPipelinePlugin from '../main';
import { TextareaStyler } from './textarea-styler';
import { DEFAULT_MODELS_CONFIG } from './default-config';

export class ModelsConfigSection {
    private plugin: ContentPipelinePlugin;
    private modelsTextarea: TextAreaComponent | null = null;
    private onChangeCallback: (value: string) => void;
    private isExpanded: boolean = false;
    private contentContainer: HTMLElement | null = null;
    private expandButton: HTMLButtonElement | null = null;

    constructor(plugin: ContentPipelinePlugin, onChangeCallback: (value: string) => void) {
        this.plugin = plugin;
        this.onChangeCallback = onChangeCallback;
    }

    /**
     * Render the models configuration section
     */
    render(containerEl: HTMLElement): void {
        // Create Models Configuration section with expand/collapse button
        new Setting(containerEl)
            .setName('🔐 Models (Advanced)')
            .setDesc('API keys, endpoints, and model specifications. Never share this configuration.')
            .addButton(button => {
                this.expandButton = button.buttonEl;
                button
                    .setButtonText(this.isExpanded ? 'Collapse' : 'Expand')
                    .setTooltip('Show/hide models configuration editor')
                    .onClick(() => this.toggleExpanded());
            });

        // Collapsible content container
        this.contentContainer = containerEl.createEl('div', { 
            cls: 'content-pipeline-collapsible-content'
        });
        this.contentContainer.style.display = 'none';

        this.renderContent();
    }

    /**
     * Render the main content (textarea and buttons)
     */
    private renderContent(): void {
        if (!this.contentContainer) return;

        // Clear existing content
        this.contentContainer.empty();

        // Models configuration textarea
        const modelsSetting = new Setting(this.contentContainer)
            .setDesc('JSON configuration for your AI models and API endpoints');

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
        this.renderDefaultConfigButton(this.contentContainer);
    }

    /**
     * Toggle the expanded/collapsed state
     */
    private toggleExpanded(): void {
        this.isExpanded = !this.isExpanded;
        this.updateDisplay();
    }

    /**
     * Update the display based on expanded state
     */
    private updateDisplay(): void {
        if (!this.contentContainer || !this.expandButton) return;

        if (this.isExpanded) {
            this.contentContainer.style.display = 'block';
            this.expandButton.textContent = 'Collapse';
        } else {
            this.contentContainer.style.display = 'none';
            this.expandButton.textContent = 'Expand';
        }
    }

    /**
     * Render the default config button
     */
    private renderDefaultConfigButton(containerEl: HTMLElement): void {
        new Setting(containerEl)
            .setName('Load default configuration')
            .setDesc('Reset to the default models configuration with placeholders for API keys.')
            .addButton(button => {
                button
                    .setButtonText('Load default')
                    .setTooltip('Replace current configuration with default template')
                    .onClick(() => {
                        const defaultConfig = JSON.stringify(DEFAULT_MODELS_CONFIG, null, 2);
                        if (this.modelsTextarea) {
                            this.modelsTextarea.setValue(defaultConfig);
                            this.onChangeCallback(defaultConfig);
                        }
                    });
            });
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

    /**
     * Expand the section programmatically
     */
    expand(): void {
        if (!this.isExpanded) {
            this.toggleExpanded();
        }
    }

    /**
     * Collapse the section programmatically
     */
    collapse(): void {
        if (this.isExpanded) {
            this.toggleExpanded();
        }
    }

    /**
     * Check if the section is currently expanded
     */
    isCurrentlyExpanded(): boolean {
        return this.isExpanded;
    }
}
