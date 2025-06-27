/**
 * OpenAI API Key configuration section
 */

import { Notice, Setting } from 'obsidian';
import ContentPipelinePlugin from '../main';
import { 
    extractOpenAIConfigs, 
    updateOpenAIApiKeys, 
    createUserFriendlyError
} from './openai-config-utils';

export class OpenAIApiKeySection {
    private plugin: ContentPipelinePlugin;
    private onChangeCallback: (value: string) => void;
    private apiKeyInput: HTMLInputElement | null = null;

    constructor(plugin: ContentPipelinePlugin, onChangeCallback: (value: string) => void) {
        this.plugin = plugin;
        this.onChangeCallback = onChangeCallback;
    }

    render(containerEl: HTMLElement): void {
        // API Key input setting
        new Setting(containerEl)
            .setName('OpenAI API key')
            .setDesc('Get your API key from OpenAI Platform →')
            .addText(text => {
                this.apiKeyInput = text.inputEl;
                text.inputEl.type = 'password';
                text.inputEl.spellcheck = false;
                text.setPlaceholder('sk-proj-...');
                text.inputEl.style.width = '300px';
                
                // Load current API key
                this.loadCurrentApiKey();
                
                return text;
            });

        // Make the description link clickable
        const descEl = containerEl.querySelector('.setting-item-description') as HTMLElement;
        if (descEl) {
            descEl.style.cursor = 'pointer';
            descEl.style.color = 'var(--text-accent)';
            descEl.onclick = () => {
                window.open('https://platform.openai.com/api-keys', '_blank', 'noopener,noreferrer');
            };
        }

        // Save button setting
        new Setting(containerEl)
            .setName('Update API key')
            .setDesc('Apply this API key to all OpenAI model configurations.')
            .addButton(button => {
                button
                    .setButtonText('Save')
                    .setCta() // Makes it the accent color
                    .setTooltip('Update all OpenAI configurations with this API key')
                    .onClick(() => this.saveApiKey());
            });
    }

    private loadCurrentApiKey(): void {
        if (!this.apiKeyInput) return;
        
        const extraction = extractOpenAIConfigs(this.plugin.settings.modelsConfig);
        this.apiKeyInput.value = extraction.currentApiKey || '';
    }

    private async saveApiKey(): Promise<void> {
        if (!this.apiKeyInput) return;
        
        const apiKey = this.apiKeyInput.value.trim();
        if (!apiKey) {
            new Notice('Please enter an API key', 3000);
            return;
        }

        try {
            const result = updateOpenAIApiKeys(this.plugin.settings.modelsConfig, apiKey);
            
            if (!result.success) {
                new Notice(`❌ ${result.error || 'Failed to update API keys'}`, 5000);
                return;
            }

            this.onChangeCallback(result.updatedModelsConfig);
            
            const configText = result.updatedCount === 1 ? 'configuration' : 'configurations';
            new Notice(`✅ Updated ${result.updatedCount} OpenAI ${configText}`, 3000);
            
        } catch (error) {
            new Notice(`❌ Failed to update API keys: ${createUserFriendlyError(error)}`, 5000);
        }
    }

    getValue(): string {
        return this.apiKeyInput?.value || '';
    }

    setValue(value: string): void {
        if (this.apiKeyInput) {
            this.apiKeyInput.value = value;
        }
    }

    refresh(): void {
        this.loadCurrentApiKey();
    }
}