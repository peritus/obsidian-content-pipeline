import { Notice } from 'obsidian';
import { ConfigurationValidator } from './configuration-validator';

/**
 * Control buttons for pipeline configuration
 */
export class ConfigurationButtons {
    /**
     * Add control buttons to the container
     */
    static addButtons(
        containerEl: HTMLElement, 
        configTextarea: any, 
        handleConfigChange: (value: string) => Promise<void>
    ): void {
        // Load Default button
        const loadDefaultBtn = containerEl.createEl('button', { text: 'Load Default' });
        loadDefaultBtn.className = 'mod-cta';
        loadDefaultBtn.style.marginRight = '8px';
        loadDefaultBtn.addEventListener('click', async () => {
            const { DEFAULT_PIPELINE_CONFIG } = await import('./default-config');
            const defaultConfig = JSON.stringify(DEFAULT_PIPELINE_CONFIG, null, 2);
            if (configTextarea) {
                configTextarea.setValue(defaultConfig);
                await handleConfigChange(defaultConfig);
            }
        });

        // Format JSON button
        const formatBtn = containerEl.createEl('button', { text: 'Format JSON' });
        formatBtn.style.marginRight = '8px';
        formatBtn.addEventListener('click', async () => {
            if (configTextarea) {
                try {
                    const current = configTextarea.getValue();
                    const parsed = JSON.parse(current);
                    const formatted = JSON.stringify(parsed, null, 2);
                    configTextarea.setValue(formatted);
                    await handleConfigChange(formatted);
                } catch (error) {
                    new Notice('❌ Cannot format: Invalid JSON syntax', 4000);
                }
            }
        });

        // Validate button
        const validateBtn = containerEl.createEl('button', { text: 'Validate' });
        validateBtn.addEventListener('click', () => {
            if (configTextarea) {
                ConfigurationValidator.validate(configTextarea.getValue(), true);
            }
        });
    }

    /**
     * Create button container with proper styling
     */
    static createButtonContainer(containerEl: HTMLElement): HTMLElement {
        const controlContainer = containerEl.createEl('div');
        controlContainer.style.marginTop = '10px';
        controlContainer.style.display = 'flex';
        controlContainer.style.gap = '8px';
        controlContainer.style.flexWrap = 'wrap';
        return controlContainer;
    }
}
