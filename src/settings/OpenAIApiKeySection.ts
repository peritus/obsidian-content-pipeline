/**
 * OpenAI API Key configuration section
 */

import { Notice } from 'obsidian';
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
        // Create the setting item
        const settingItem = containerEl.createEl('div', { cls: 'setting-item' });
        
        // Setting item info
        const settingInfo = settingItem.createEl('div', { cls: 'setting-item-info' });
        settingInfo.createEl('div', { cls: 'setting-item-name', text: 'OpenAI API key' });
        
        const settingDesc = settingInfo.createEl('div', { cls: 'setting-item-description' });
        const link = settingDesc.createEl('a', {
            text: 'Get your API key from OpenAI Platform →',
            href: 'https://platform.openai.com/api-keys'
        });
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        
        // Setting item control
        const settingControl = settingItem.createEl('div', { cls: 'setting-item-control' });
        
        // Password input
        this.apiKeyInput = settingControl.createEl('input', {
            type: 'password'
        }) as HTMLInputElement;
        this.apiKeyInput.spellcheck = false;
        this.apiKeyInput.placeholder = 'sk-proj-...';
        this.apiKeyInput.style.width = '300px';
        
        // Load current API key
        this.loadCurrentApiKey();
        
        // Save button
        const saveButton = settingControl.createEl('button', {
            text: 'Save'
        });
        saveButton.setAttribute('aria-label', 'Update all OpenAI configurations with this API key');
        saveButton.style.backgroundColor = 'var(--interactive-accent)';
        
        saveButton.onclick = () => this.saveApiKey();
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