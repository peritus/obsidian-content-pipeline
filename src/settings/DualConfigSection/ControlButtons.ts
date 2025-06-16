/**
 * Control buttons component for configuration actions
 */

import AudioInboxPlugin from '../../main';
import { DualConfigurationValidator } from '../dual-configuration-validator';

export class ControlButtons {
    private plugin: AudioInboxPlugin;
    private validator: DualConfigurationValidator;

    constructor(plugin: AudioInboxPlugin, validator: DualConfigurationValidator) {
        this.plugin = plugin;
        this.validator = validator;
    }

    /**
     * Render control buttons section
     */
    render(containerEl: HTMLElement, onValidationCallback: () => void): void {
        const buttonContainer = containerEl.createEl('div');
        buttonContainer.style.marginTop = '20px';
        buttonContainer.style.marginBottom = '20px';
        buttonContainer.style.display = 'flex';
        buttonContainer.style.gap = '10px';
        buttonContainer.style.flexWrap = 'wrap';

        // Validate configuration button
        const validateBtn = buttonContainer.createEl('button', { text: 'Validate Configuration' });
        validateBtn.onclick = () => onValidationCallback();

        // Create initial folders button
        const createFoldersBtn = buttonContainer.createEl('button', { text: 'Create Initial Folders' });
        createFoldersBtn.onclick = () => this.createInitialFolders();
    }

    /**
     * Create initial folder structure
     */
    private async createInitialFolders(): Promise<void> {
        const validationResult = this.validator.validate(
            this.plugin.settings.modelsConfig,
            this.plugin.settings.pipelineConfig,
            false
        );

        if (!validationResult.isValid) {
            this.validator.showValidationError(validationResult);
            return;
        }

        try {
            const resolver = this.validator.getConfigurationResolver(
                this.plugin.settings.modelsConfig,
                this.plugin.settings.pipelineConfig
            );

            const entryPoints = resolver.findEntryPoints();
            let foldersCreated = 0;

            for (const stepId of entryPoints) {
                const resolvedStep = resolver.resolveStep(stepId);
                const inputPath = resolvedStep.input;
                
                if (!(await this.plugin.app.vault.adapter.exists(inputPath))) {
                    await this.plugin.app.vault.createFolder(inputPath);
                    foldersCreated++;
                }
            }

            this.validator.showSuccessNotice(`Created ${foldersCreated} initial folders for entry points`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.validator.showErrorNotice(`Failed to create folders: ${errorMessage}`);
        }
    }
}