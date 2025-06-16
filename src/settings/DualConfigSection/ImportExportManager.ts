/**
 * Import/Export manager for pipeline configuration
 */

import { DualConfigurationValidator } from '../dual-configuration-validator';

export class ImportExportManager {
    private validator: DualConfigurationValidator;
    private onImportCallback: (config: string) => void;

    constructor(validator: DualConfigurationValidator, onImportCallback: (config: string) => void) {
        this.validator = validator;
        this.onImportCallback = onImportCallback;
    }

    /**
     * Export pipeline configuration
     */
    exportPipelineConfig(modelsConfig: string, pipelineConfig: string): void {
        try {
            const validationResult = this.validator.validate(modelsConfig, pipelineConfig, false);

            if (!validationResult.isValid) {
                this.validator.showValidationError(validationResult);
                return;
            }

            const resolver = this.validator.getConfigurationResolver(modelsConfig, pipelineConfig);

            const exportData = {
                version: '1.2',
                exported: new Date().toISOString(),
                description: 'Audio Inbox Pipeline Configuration',
                config: resolver.exportPipelineConfig()
            };

            const dataStr = JSON.stringify(exportData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = `audio-inbox-pipeline-${new Date().toISOString().split('T')[0]}.json`;
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            this.validator.showSuccessNotice('Pipeline configuration exported successfully!');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.validator.showErrorNotice(`Failed to export configuration: ${errorMessage}`);
        }
    }

    /**
     * Import pipeline configuration
     */
    importPipelineConfig(): void {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = (event) => {
            const file = (event.target as HTMLInputElement).files?.[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const content = e.target?.result as string;
                    const importData = JSON.parse(content);
                    
                    // Validate import structure
                    if (!importData.config) {
                        throw new Error('Invalid import file - missing config section');
                    }

                    const configStr = JSON.stringify(importData.config, null, 2);
                    this.onImportCallback(configStr);
                    
                    this.validator.showSuccessNotice('Pipeline configuration imported successfully!');
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    this.validator.showErrorNotice(`Failed to import configuration: ${errorMessage}`);
                }
            };
            
            reader.readAsText(file);
        };
        
        input.click();
    }
}