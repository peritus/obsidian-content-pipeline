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
        // Pipeline configuration header
        const pipelineHeaderEl = containerEl.createEl('div', { cls: 'content-pipeline-section-header' });
        
        const pipelineHeader = pipelineHeaderEl.createEl('h4', { text: '🔄 Pipeline Configuration (Shareable)' });
        
        const pipelineDesc = pipelineHeaderEl.createEl('div', { cls: 'content-pipeline-section-description' });
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
                this.onChangeCallback(value);
            });
            
            return text;
        });

        // Add action buttons for pipeline
        this.renderActionButtons(containerEl);
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
}
