/**
 * Pipeline configuration section - OPTION 1: Button-based expand/collapse
 */

import { Setting, TextAreaComponent, DropdownComponent } from 'obsidian';
import ContentPipelinePlugin from '../main';
import { TextareaStyler } from './textarea-styler';
import { BUNDLED_PIPELINE_CONFIGS } from '@/configs';
import { extractPipelineSteps } from '../types';

export class PipelineConfigSection {
    private plugin: ContentPipelinePlugin;
    private pipelineTextarea: TextAreaComponent | null = null;
    private selectedConfigId: string = '';  // No config pre-selected
    private onChangeCallback: (value: string) => void;
    private onExportCallback: () => void;
    private onImportCallback: () => void;
    private isExpanded: boolean = false;
    private contentContainer: HTMLElement | null = null;
    private expandButton: HTMLButtonElement | null = null;

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

    render(containerEl: HTMLElement): void {
        // Render action buttons as independent sections
        this.renderActionButtons(containerEl);

        // Create Pipeline Configuration section with expand/collapse button
        new Setting(containerEl)
            .setName('Pipeline Configuration (JSON)')
            .setDesc('Configure workflow steps, routing logic, and file processing patterns.')
            .addButton(button => {
                this.expandButton = button.buttonEl;
                button
                    .setButtonText(this.isExpanded ? 'Collapse' : 'Expand')
                    .setTooltip('Show/hide pipeline configuration editor')
                    .onClick(() => this.toggleExpanded());
            });

        // Collapsible content container for textarea
        this.contentContainer = containerEl.createEl('div', { 
            cls: 'content-pipeline-collapsible-content'
        });
        this.contentContainer.style.display = 'none';

        this.renderTextareaContent();
    }

    private renderTextareaContent(): void {
        if (!this.contentContainer) return;

        this.contentContainer.empty();

        const pipelineSetting = new Setting(this.contentContainer)
            .setDesc('JSON configuration for your content processing pipeline');

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

    private toggleExpanded(): void {
        this.isExpanded = !this.isExpanded;
        this.updateDisplay();
    }

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

    // ... rest of the methods remain the same
    private renderActionButtons(containerEl: HTMLElement): void {
        new Setting(containerEl)
            .setName('Load example configuration')
            .setDesc('Choose from available example configurations to load as a starting point.')
            .addDropdown(dropdown => {
                // Add placeholder option
                dropdown.addOption('', 'Select a configuration...');
                
                const availableConfigs = Object.keys(BUNDLED_PIPELINE_CONFIGS);
                availableConfigs.forEach(configId => {
                    const config = BUNDLED_PIPELINE_CONFIGS[configId];
                    const description = config.pipeline.description || `${configId} configuration`;
                    dropdown.addOption(configId, description);
                });
                dropdown.setValue(this.selectedConfigId);
                dropdown.onChange((selectedConfigId) => {
                    this.selectedConfigId = selectedConfigId;
                });
                return dropdown;
            })
            .addButton(button => {
                button
                    .setButtonText('Load')
                    .setTooltip('Load the selected configuration')
                    .onClick(async () => {
                        if (!this.selectedConfigId || this.selectedConfigId === '') {
                            // Show notice that user needs to select a config
                            return;
                        }
                        
                        const selectedConfig = BUNDLED_PIPELINE_CONFIGS[this.selectedConfigId];
                        if (selectedConfig) {
                            const pipelineSteps = extractPipelineSteps(selectedConfig.pipeline);
                            const configJson = JSON.stringify(pipelineSteps, null, 2);
                            if (this.pipelineTextarea) {
                                this.pipelineTextarea.setValue(configJson);
                                this.onChangeCallback(configJson);
                            }
                            
                            // Copy example prompts to settings
                            this.plugin.settings.importedExamplePrompts = selectedConfig.examplePrompts;
                            
                            // Save settings to persist the prompts
                            try {
                                await this.plugin.saveSettings();
                            } catch (error) {
                                console.error('Failed to save example prompts:', error);
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

    getValue(): string {
        return this.pipelineTextarea?.getValue() || '';
    }

    setValue(value: string): void {
        if (this.pipelineTextarea) {
            this.pipelineTextarea.setValue(value);
        }
    }

    expand(): void {
        if (!this.isExpanded) {
            this.toggleExpanded();
        }
    }

    collapse(): void {
        if (this.isExpanded) {
            this.toggleExpanded();
        }
    }

    isCurrentlyExpanded(): boolean {
        return this.isExpanded;
    }
}
