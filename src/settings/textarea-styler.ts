import { TextAreaComponent } from 'obsidian';

/**
 * Textarea styling utilities for configuration
 */
export class TextareaStyler {
    /**
     * Apply full width styling to textarea
     */
    static styleTextarea(text: TextAreaComponent): void {
        // Style the textarea container
        const textareaContainer = text.inputEl.parentElement;
        if (textareaContainer) {
            textareaContainer.addClass('content-pipeline-textarea-container');
        }
        
        // Style the textarea itself
        text.inputEl.addClass('content-pipeline-textarea');
    }

    /**
     * Apply full width styling to setting element
     */
    static styleSettingElement(settingEl: HTMLElement): void {
        settingEl.addClass('content-pipeline-setting-element');
    }
}
