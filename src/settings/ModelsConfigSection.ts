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
    private isExpanded: boolean = false;
    private contentContainer: HTMLElement | null = null;
    private toggleButton: HTMLElement | null = null;
    private descriptionEl: HTMLElement | null = null;

    constructor(plugin: ContentPipelinePlugin, onChangeCallback: (value: string) => void) {
        this.plugin = plugin;
        this.onChangeCallback = onChangeCallback;
    }

    /**
     * Render the models configuration section
     */
    render(containerEl: HTMLElement): void {
        // Create section heading using proper Obsidian method
        new Setting(containerEl).setName('🔐 Models Configuration (Advanced)').setHeading();

        // Models configuration header with toggle
        const headerEl = containerEl.createEl('div', { cls: 'content-pipeline-section-header content-pipeline-collapsible-header' });
        
        const titleRow = headerEl.createEl('div', { cls: 'content-pipeline-header-row' });
        
        // Toggle button - plain text style
        this.toggleButton = titleRow.createEl('span', { 
            cls: 'content-pipeline-toggle-text',
            text: '▶'
        });
        this.toggleButton.onclick = () => this.toggleExpanded();
        
        // Toggle text without heading element - just styled text
        const toggleText = titleRow.createEl('span', { 
            text: 'Click to expand configuration',
            cls: 'content-pipeline-toggle-label'
        });
        toggleText.onclick = () => this.toggleExpanded();

        // Collapsible content container
        this.contentContainer = containerEl.createEl('div', { 
            cls: 'content-pipeline-collapsible-content'
        });
        this.contentContainer.style.display = 'none'; // Start collapsed

        this.renderContent();
    }

    /**
     * Render the main content (textarea and buttons)
     */
    private renderContent(): void {
        if (!this.contentContainer) return;

        // Clear existing content
        this.contentContainer.empty();

        // Add description as first element in collapsible content
        this.descriptionEl = this.contentContainer.createEl('div', { cls: 'content-pipeline-section-description' });
        this.descriptionEl.innerHTML = 'API keys, endpoints, and model specifications. <strong>Never share this configuration.</strong>';

        // Models configuration textarea
        const modelsSetting = new Setting(this.contentContainer);

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
        if (!this.contentContainer || !this.toggleButton) return;

        if (this.isExpanded) {
            this.contentContainer.style.display = 'block';
            this.toggleButton.textContent = '▼';
            this.toggleButton.setAttribute('aria-expanded', 'true');
        } else {
            this.contentContainer.style.display = 'none';
            this.toggleButton.textContent = '▶';
            this.toggleButton.setAttribute('aria-expanded', 'false');
        }
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
