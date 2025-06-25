/**
 * OpenAI API Key configuration section
 */

import { Setting, TextComponent, Notice } from 'obsidian';
import ContentPipelinePlugin from '../main';
import { 
    extractOpenAIConfigs, 
    updateOpenAIApiKeys, 
    isValidOpenAIApiKey,
    getOpenAIConfigSummary,
    createUserFriendlyError
} from './openai-config-utils';

export class OpenAIApiKeySection {
    private plugin: ContentPipelinePlugin;
    private apiKeyInput: TextComponent | null = null;
    private onChangeCallback: (value: string) => void;
    private currentApiKey: string = '';
    private saveButton: HTMLButtonElement | null = null;
    private statusEl: HTMLElement | null = null;

    constructor(plugin: ContentPipelinePlugin, onChangeCallback: (value: string) => void) {
        this.plugin = plugin;
        this.onChangeCallback = onChangeCallback;
    }

    render(containerEl: HTMLElement): void {
        // Header
        const headerEl = containerEl.createEl('div', { cls: 'content-pipeline-section-header' });
        headerEl.createEl('h4', { text: '🔑 OpenAI API Key' });
        
        const desc = headerEl.createEl('div', { cls: 'content-pipeline-section-description' });
        desc.innerHTML = 'Simplified configuration for OpenAI services. Updates all OpenAI model configurations.';

        // API Key input
        const setting = new Setting(containerEl)
            .setName('API key')
            .setDesc(this.createDescription());

        setting.addText(text => {
            this.apiKeyInput = text;
            text.setPlaceholder('sk-proj-...');
            text.inputEl.type = 'password';
            text.inputEl.style.width = '300px';
            
            this.loadCurrentApiKey();
            text.setValue(this.currentApiKey);
            
            text.onChange((value) => {
                this.currentApiKey = value;
                this.updateButton();
                this.updateStatus();
            });
            
            return text;
        });

        setting.addButton(button => {
            this.saveButton = button.buttonEl;
            button
                .setButtonText('Save')
                .setTooltip('Update all OpenAI configurations with this API key')
                .onClick(() => this.saveApiKey());
            
            this.updateButton();
            return button;
        });

        // Status
        this.statusEl = containerEl.createEl('div', { cls: 'content-pipeline-openai-status' });
        this.updateStatus();

        // Help link
        const helpEl = containerEl.createEl('div', { cls: 'content-pipeline-openai-help' });
        const link = helpEl.createEl('a', {
            text: 'Get your API key from OpenAI Platform →',
            href: 'https://platform.openai.com/api-keys'
        });
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
    }

    private createDescription(): DocumentFragment {
        const fragment = document.createDocumentFragment();
        const summary = getOpenAIConfigSummary(this.plugin.settings.modelsConfig);
        fragment.appendText(`Enter your OpenAI API key to update all OpenAI configurations. Current status: ${summary}`);
        return fragment;
    }

    private loadCurrentApiKey(): void {
        const extraction = extractOpenAIConfigs(this.plugin.settings.modelsConfig);
        this.currentApiKey = extraction.currentApiKey || '';
    }

    private updateButton(): void {
        if (!this.saveButton) return;

        const hasValue = this.currentApiKey?.trim();
        const isValid = hasValue ? isValidOpenAIApiKey(this.currentApiKey) : true;
        
        this.saveButton.disabled = !hasValue || !isValid;
        
        if (hasValue && !isValid) {
            this.saveButton.textContent = 'Invalid format';
            this.saveButton.style.backgroundColor = 'var(--background-modifier-error)';
        } else {
            this.saveButton.textContent = 'Save';
            this.saveButton.style.backgroundColor = hasValue ? 'var(--interactive-accent)' : '';
        }
    }

    private updateStatus(): void {
        if (!this.statusEl) return;

        const extraction = extractOpenAIConfigs(this.plugin.settings.modelsConfig);
        
        if (!extraction.hasOpenAIConfigs) {
            this.statusEl.textContent = 'No OpenAI configurations found';
            this.statusEl.className = 'content-pipeline-openai-status content-pipeline-openai-warning';
            return;
        }

        const hasCurrentKey = extraction.currentApiKey?.trim();
        const hasInputKey = this.currentApiKey?.trim();
        
        let text: string;
        let className: string;

        if (hasCurrentKey) {
            text = `${extraction.count} OpenAI config(s) with API key configured`;
            className = 'content-pipeline-openai-status content-pipeline-openai-success';
        } else if (hasInputKey) {
            if (isValidOpenAIApiKey(this.currentApiKey)) {
                text = `Ready to update ${extraction.count} OpenAI config(s)`;
                className = 'content-pipeline-openai-status content-pipeline-openai-ready';
            } else {
                text = 'Invalid API key format';
                className = 'content-pipeline-openai-status content-pipeline-openai-error';
            }
        } else {
            text = `${extraction.count} OpenAI config(s) found, no API key configured`;
            className = 'content-pipeline-openai-status content-pipeline-openai-warning';
        }

        this.statusEl.textContent = text;
        this.statusEl.className = className;
    }

    private async saveApiKey(): Promise<void> {
        if (!this.currentApiKey?.trim()) {
            new Notice('Please enter an API key', 3000);
            return;
        }

        try {
            const result = updateOpenAIApiKeys(this.plugin.settings.modelsConfig, this.currentApiKey);
            
            if (!result.success) {
                new Notice(`❌ ${result.error || 'Failed to update API keys'}`, 5000);
                return;
            }

            this.onChangeCallback(result.updatedModelsConfig);
            
            const configText = result.updatedCount === 1 ? 'configuration' : 'configurations';
            new Notice(`✅ Updated ${result.updatedCount} OpenAI ${configText}`, 3000);
            
            this.updateStatus();
            this.updateButton();
            
        } catch (error) {
            new Notice(`❌ Failed to update API keys: ${createUserFriendlyError(error)}`, 5000);
        }
    }

    getValue(): string {
        return this.currentApiKey;
    }

    setValue(value: string): void {
        this.currentApiKey = value;
        if (this.apiKeyInput) {
            this.apiKeyInput.setValue(value);
        }
        this.updateButton();
        this.updateStatus();
    }

    refresh(): void {
        this.loadCurrentApiKey();
        if (this.apiKeyInput) {
            this.apiKeyInput.setValue(this.currentApiKey);
        }
        this.updateButton();
        this.updateStatus();
    }
}