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
    private debounceTimer: NodeJS.Timeout | null = null;

    constructor(plugin: ContentPipelinePlugin, onChangeCallback: (value: string) => void) {
        this.plugin = plugin;
        this.onChangeCallback = onChangeCallback;
    }

    render(containerEl: HTMLElement): void {
        // API Key input setting with auto-save
        new Setting(containerEl)
            .setName('OpenAI API key')
            .setDesc('Get your API key from OpenAI Platform →')
            .addText(text => {
                this.apiKeyInput = text.inputEl;
                text.inputEl.spellcheck = false;
                text.setPlaceholder('sk-proj-...');
                text.inputEl.style.width = '300px';

                // Load current API key
                this.loadCurrentApiKey();

                // Auto-save on change with debouncing
                text.onChange((_value) => {
                    this.debouncedSave();
                });

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
    }

    private loadCurrentApiKey(): void {
        if (!this.apiKeyInput) return;

        const extraction = extractOpenAIConfigs(this.plugin.settings.modelsConfig);
        this.apiKeyInput.value = extraction.currentApiKey || '';
    }

    /**
     * Debounced save to avoid excessive API calls
     */
    private debouncedSave(): void {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }

        this.debounceTimer = setTimeout(() => {
            this.saveApiKey();
        }, 500); // 500ms debounce
    }

    private async saveApiKey(): Promise<void> {
        if (!this.apiKeyInput) return;

        const apiKey = this.apiKeyInput.value.trim();

        // Skip saving if empty (user might be clearing the field)
        if (!apiKey) {
            return;
        }

        try {
            const result = updateOpenAIApiKeys(this.plugin.settings.modelsConfig, apiKey);

            if (!result.success) {
                new Notice(`❌ ${result.error || 'Failed to update API keys'}`, 5000);
                return;
            }

            // Update the models config through the callback (triggers auto-save)
            this.onChangeCallback(result.updatedModelsConfig);

            // No success notice for auto-save to avoid being intrusive

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
