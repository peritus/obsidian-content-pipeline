import { TextAreaComponent } from 'obsidian';

/**
 * Textarea styling utilities for configuration
 */
export class TextareaStyler {
    /**
     * Apply full width styling to textarea
     */
    static styleTextarea(text: TextAreaComponent): void {
        // Style the textarea container and input
        const textareaContainer = text.inputEl.parentElement;
        if (textareaContainer) {
            textareaContainer.style.width = '100%';
            textareaContainer.style.maxWidth = 'none';
        }
        
        // Style the textarea itself
        text.inputEl.style.width = '100%';
        text.inputEl.style.minWidth = '100%';
        text.inputEl.style.maxWidth = '100%';
        text.inputEl.style.height = '400px';
        text.inputEl.style.fontFamily = 'var(--font-monospace), Consolas, "Courier New", monospace';
        text.inputEl.style.fontSize = '12px';
        text.inputEl.style.lineHeight = '1.4';
        text.inputEl.style.resize = 'vertical';
        text.inputEl.style.border = '1px solid var(--background-modifier-border)';
        text.inputEl.style.borderRadius = '4px';
        text.inputEl.style.padding = '8px';
        text.inputEl.style.backgroundColor = 'var(--background-primary)';
        text.inputEl.style.color = 'var(--text-normal)';
        text.inputEl.style.boxSizing = 'border-box';
    }

    /**
     * Apply full width styling to setting element
     */
    static styleSettingElement(settingEl: HTMLElement): void {
        settingEl.style.display = 'block';
    }
}
