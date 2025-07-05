/**
 * Import/Export manager for pipeline configuration
 */

import { Notice } from 'obsidian';
import { parseAndValidateFromJson } from '../validation';

export interface ImportExportCallbacks {
    onPipelineImport: (config: string) => void;
    onConfigPromptsImport: (prompts: Record<string, string>) => void;
}

export class ImportExportManager {
    private callbacks: ImportExportCallbacks;

    constructor(callbacks: ImportExportCallbacks) {
        this.callbacks = callbacks;
    }

    /**
     * Export pipeline configuration
     */
    exportPipelineConfig(modelsConfig: string, pipelineConfig: string): void {
        try {
            // Use centralized validation function
            const { modelsConfig: models, pipelineConfig: pipeline } = parseAndValidateFromJson(modelsConfig, pipelineConfig);

            const exportData = {
                version: '1.2',
                exported: new Date().toISOString(),
                description: 'Content Pipeline Pipeline Configuration',
                pipeline: pipeline
            };

            const dataStr = JSON.stringify(exportData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = `content-pipeline-pipeline-${new Date().toISOString().split('T')[0]}.json`;
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            new Notice('Pipeline configuration exported successfully!', 3000);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            new Notice(`Failed to export configuration: ${errorMessage}`, 6000);
        }
    }

    /**
     * Import pipeline configuration with support for bundled config-defined prompts
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
                    
                    // Validate the import file structure
                    if (!importData.pipeline) {
                        throw new Error('Invalid import file - missing "pipeline" section. Expected format: { "pipeline": {...} }');
                    }

                    // Import the pipeline configuration
                    const pipelineConfigStr = JSON.stringify(importData.pipeline, null, 2);
                    this.callbacks.onPipelineImport(pipelineConfigStr);

                    // Import config-defined prompts if they exist
                    if (importData.examplePrompts && typeof importData.examplePrompts === 'object') {
                        const promptCount = Object.keys(importData.examplePrompts).length;
                        if (promptCount > 0) {
                            this.callbacks.onConfigPromptsImport(importData.examplePrompts);
                            new Notice(`Pipeline configuration imported with ${promptCount} config-defined prompts!`, 4000);
                        } else {
                            new Notice('Pipeline configuration imported successfully!', 3000);
                        }
                    } else {
                        new Notice('Pipeline configuration imported successfully!', 3000);
                    }
                    
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    new Notice(`Failed to import configuration: ${errorMessage}`, 6000);
                }
            };
            
            reader.readAsText(file);
        };
        
        input.click();
    }
}