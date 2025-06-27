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
    private headingElement: HTMLElement | null = null;
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
        // Create heading using Obsidian's method
        const headingSetting = new Setting(containerEl)
            .setName('🔄 Pipeline (Advanced)')
            .setHeading();
        
        // Make the entire heading clickable with CSS toggle classes
        this.headingElement = headingSetting.settingEl;
        this.headingElement.addClass('content-pipeline-clickable-heading');
        this.headingElement.addClass('content-pipeline-toggle-heading'); // CSS handles toggle indicators
        this.headingElement.onclick = () => this.toggleExpanded();

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
        if (!this.contentContainer || !this.headingElement) return;

        if (this.isExpanded) {
            this.contentContainer.style.display = 'block';
            this.headingElement.addClass('expanded');
            this.headingElement.setAttribute('aria-expanded', 'true');
        } else {
            this.contentContainer.style.display = 'none';
            this.headingElement.removeClass('expanded');
            this.headingElement.setAttribute('aria-expanded', 'false');
        }
    }

    /**
     * Render the action buttons for pipeline configuration
     */
    private renderActionButtons(containerEl: HTMLElement): void {
        new Setting(containerEl)
            .setName('Load default configuration')
            .setDesc('Reset to the default pipeline configuration with basic workflow steps.')
            .addButton(button => {
                button
                    .setButtonText('Load default')
                    .setTooltip('Replace current configuration with default template')
                    .onClick(() => {
                        const defaultConfig = JSON.stringify(DEFAULT_PIPELINE_CONFIG, null, 2);
                        if (this.pipelineTextarea) {
                            this.pipelineTextarea.setValue(defaultConfig);
                            this.onChangeCallback(defaultConfig);
                        }
                    });
            });

        new Setting(containerEl)
            .setName('Export configuration')
            .setDesc('Download your pipeline configuration as a JSON file to share or backup.')
            .addButton(button => {
                button
                    .setButtonText('Export')
                    .setTooltip('Download pipeline configuration as JSON file')
                    .onClick(this.onExportCallback);
            });

        new Setting(containerEl)
            .setName('Import configuration')
            .setDesc('Upload and apply a pipeline configuration from a JSON file.')
            .addButton(button => {
                button
                    .setButtonText('Import')
                    .setTooltip('Upload and apply pipeline configuration from JSON file')
                    .onClick(this.onImportCallback);
            });
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
