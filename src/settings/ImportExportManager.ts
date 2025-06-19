/**
 * Import/Export manager for pipeline configuration
 */

import { Notice } from 'obsidian';
import { createConfigurationResolver } from '../validation/configuration-resolver';

export interface ImportExportCallbacks {
    onPipelineImport: (config: string) => void;
    onExamplePromptsImport: (prompts: Record<string, string>) => void;
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
            const resolver = createConfigurationResolver(modelsConfig, pipelineConfig);
            const validationResult = resolver.validate();

            if (!validationResult.isValid) {
                const errorSections = [];
                if (validationResult.modelsErrors.length > 0) {
                    errorSections.push(`Models: ${validationResult.modelsErrors.join('; ')}`);
                }
                if (validationResult.pipelineErrors.length > 0) {
                    errorSections.push(`Pipeline: ${validationResult.pipelineErrors.join('; ')}`);
                }
                if (validationResult.crossRefErrors.length > 0) {
                    errorSections.push(`Cross-reference: ${validationResult.crossRefErrors.join('; ')}`);
                }
                
                const message = errorSections.length > 0 
                    ? `❌ Configuration errors: ${errorSections.join(' | ')}`
                    : '❌ Configuration validation failed';
                    
                new Notice(message, 8000);
                return;
            }

            const exportData = {
                version: '1.2',
                exported: new Date().toISOString(),
                description: 'Content Pipeline Pipeline Configuration',
                pipeline: resolver.exportPipelineConfig()
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
     * Import pipeline configuration with support for bundled example prompts
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

                    // Import example prompts if they exist
                    if (importData.examplePrompts && typeof importData.examplePrompts === 'object') {
                        const promptCount = Object.keys(importData.examplePrompts).length;
                        if (promptCount > 0) {
                            this.callbacks.onExamplePromptsImport(importData.examplePrompts);
                            new Notice(`Pipeline configuration imported with ${promptCount} example prompts!`, 4000);
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