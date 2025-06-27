/**
 * Pipeline configuration section - handles rendering and logic for pipeline config textarea
 */

import { Setting, TextAreaComponent } from 'obsidian';
import ContentPipelinePlugin from '../main';
import { TextareaStyler } from './textarea-styler';
import { DEFAULT_PIPELINE_CONFIG } from './default-config';

export class PipelineConfigSection {
    private plugin: ContentPipelinePlugin;
    private pipelineTextarea: TextAreaComponent | null = null;
    private onChangeCallback: (value: string) => void;
    private onExportCallback: () => void;
    private onImportCallback: () => void;
    private isExpanded: boolean = false;
    private contentContainer: HTMLElement | null = null;
    private toggleButton: HTMLElement | null = null;
    private descriptionEl: HTMLElement | null = null;

    constructor(
        plugin: ContentPipelinePlugin, 
        onChangeCallback: (value: string) => void,
        onExportCallback: () => void,
        onImportCallback: () => void
    ) {
        this.plugin = plugin;
        this.onChangeCallback = onChangeCallback;
        this.onExportCallback = onExportCallback;
        this.onImportCallback = onImportCallback;
    }

    /**
     * Render the pipeline configuration section
     */
    render(containerEl: HTMLElement): void {
        // Create section heading using proper Obsidian method
        new Setting(containerEl).setName('🔄 Pipeline Configuration').setHeading();

        // Toggle control area
        const toggleArea = containerEl.createEl('div', { cls: 'content-pipeline-toggle-area' });
        
        // Toggle button and text in a row
        this.toggleButton = toggleArea.createEl('span', { 
            cls: 'content-pipeline-toggle-text',
            text: '▶'
        });
        this.toggleButton.onclick = () => this.toggleExpanded();
        
        // Simple toggle label
        const toggleLabel = toggleArea.createEl('span', { 
            text: 'Advanced configuration',
            cls: 'content-pipeline-toggle-label'
        });
        toggleLabel.onclick = () => this.toggleExpanded();

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
        this.descriptionEl.innerHTML = 'Workflow logic and routing rules. <strong>Safe to export and share.</strong>';

        // Pipeline configuration textarea
        const pipelineSetting = new Setting(this.contentContainer)
            .setName('Pipeline Configuration (JSON)')
            .setDesc('Configure workflow steps, routing logic, and file processing patterns.');

        TextareaStyler.styleSettingElement(pipelineSetting.settingEl);
        
        pipelineSetting.addTextArea(text => {
            this.pipelineTextarea = text;
            TextareaStyler.styleTextarea(text);
            text.setPlaceholder('{\n  "transcribe": {\n    "modelConfig": "openai-whisper",\n    "input": "inbox/audio",\n    "output": "inbox/transcripts/{filename}-transcript.md"\n  }\n}');
            text.setValue(this.plugin.settings.pipelineConfig);
            
            text.onChange((value) => {
                this.onChangeCallback(value);
            });
            
            return text;
        });

        // Add action buttons for pipeline
        this.renderActionButtons(this.contentContainer);
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
     * Render the action buttons for pipeline configuration
     */
    private renderActionButtons(containerEl: HTMLElement): void {
        const pipelineButtonContainer = containerEl.createEl('div', { cls: 'content-pipeline-config-button-container' });
        
        const loadDefaultPipelineBtn = pipelineButtonContainer.createEl('button', { 
            text: 'Load Default Pipeline Config',
            cls: 'content-pipeline-config-button'
        });
        loadDefaultPipelineBtn.onclick = () => {
            const defaultConfig = JSON.stringify(DEFAULT_PIPELINE_CONFIG, null, 2);
            if (this.pipelineTextarea) {
                this.pipelineTextarea.setValue(defaultConfig);
                this.onChangeCallback(defaultConfig);
            }
        };

        const exportBtn = pipelineButtonContainer.createEl('button', { 
            text: 'Export Pipeline Config',
            cls: 'content-pipeline-config-button'
        });
        exportBtn.onclick = this.onExportCallback;

        const importBtn = pipelineButtonContainer.createEl('button', { text: 'Import Pipeline Config' });
        importBtn.onclick = this.onImportCallback;
    }

    /**
     * Get the current textarea value
     */
    getValue(): string {
        return this.pipelineTextarea?.getValue() || '';
    }

    /**
     * Set the textarea value
     */
    setValue(value: string): void {
        if (this.pipelineTextarea) {
            this.pipelineTextarea.setValue(value);
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
