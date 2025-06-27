/**
 * Pipeline configuration section - handles rendering and logic for pipeline config textarea
 */

import { Setting, TextAreaComponent, DropdownComponent } from 'obsidian';
import ContentPipelinePlugin from '../main';
import { TextareaStyler } from './textarea-styler';
import { DEFAULT_CONFIGS } from '@/configs';
import { extractPipelineSteps } from '../types';

export class PipelineConfigSection {
    private plugin: ContentPipelinePlugin;
    private pipelineTextarea: TextAreaComponent | null = null;
    private selectedConfigId: string = 'default'; // Default to first available config
    private onChangeCallback: (value: string) => void;
    private onExportCallback: () => void;
    private onImportCallback: () => void;
    private isExpanded: boolean = false;
    private contentContainer: HTMLElement | null = null;
    private headingElement: HTMLElement | null = null;

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
        // Create section heading
        new Setting(containerEl)
            .setName('🔄 Pipeline (Advanced)')
            .setHeading();

        // Add description
        const descriptionEl = containerEl.createEl('div', { cls: 'content-pipeline-section-description' });
        descriptionEl.innerHTML = 'Workflow logic and routing rules. <strong>Safe to export and share.</strong>';

        // Render action buttons as independent sections
        this.renderActionButtons(containerEl);

        // Create collapsible section for Pipeline Configuration (JSON)
        const configHeadingSetting = new Setting(containerEl)
            .setName('Pipeline Configuration (JSON)')
            .setHeading();
        
        // Make the config heading clickable with CSS toggle classes
        this.headingElement = configHeadingSetting.settingEl;
        this.headingElement.addClass('content-pipeline-clickable-heading');
        this.headingElement.addClass('content-pipeline-toggle-heading'); // CSS handles toggle indicators
        this.headingElement.onclick = () => this.toggleExpanded();

        // Collapsible content container for textarea
        this.contentContainer = containerEl.createEl('div', { 
            cls: 'content-pipeline-collapsible-content'
        });
        this.contentContainer.style.display = 'none'; // Start collapsed

        this.renderTextareaContent();
    }

    /**
     * Render the textarea content (collapsible part)
     */
    private renderTextareaContent(): void {
        if (!this.contentContainer) return;

        // Clear existing content
        this.contentContainer.empty();

        // Pipeline configuration textarea
        const pipelineSetting = new Setting(this.contentContainer)
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
     * Render the action buttons as independent sections
     */
    private renderActionButtons(containerEl: HTMLElement): void {
        // Configuration loader with dropdown + button
        new Setting(containerEl)
            .setName('Load example configuration')
            .setDesc('Choose from available example configurations to load as a starting point.')
            .addDropdown(dropdown => {
                // Populate dropdown with available configurations
                const availableConfigs = Object.keys(DEFAULT_CONFIGS);
                
                // Add options to dropdown with descriptions
                availableConfigs.forEach(configId => {
                    const config = DEFAULT_CONFIGS[configId];
                    const description = config.pipeline.description || `${configId} configuration`;
                    dropdown.addOption(configId, description);
                });
                
                // Set initial value
                dropdown.setValue(this.selectedConfigId);
                
                // Update selected config when dropdown changes
                dropdown.onChange((selectedConfigId) => {
                    this.selectedConfigId = selectedConfigId;
                });
                
                return dropdown;
            })
            .addButton(button => {
                button
                    .setButtonText('Load')
                    .setTooltip('Load the selected configuration')
                    .onClick(() => {
                        const selectedConfig = DEFAULT_CONFIGS[this.selectedConfigId];
                        if (selectedConfig) {
                            // Extract just the pipeline steps (without description) for the textarea
                            const pipelineSteps = extractPipelineSteps(selectedConfig.pipeline);
                            const configJson = JSON.stringify(pipelineSteps, null, 2);
                            
                            // Ensure section is expanded so user can see the loaded config
                            if (!this.isExpanded) {
                                this.expand();
                            }
                            
                            if (this.pipelineTextarea) {
                                this.pipelineTextarea.setValue(configJson);
                                this.onChangeCallback(configJson);
                            }
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
