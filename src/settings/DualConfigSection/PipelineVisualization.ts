/**
 * Pipeline visualization component - handles rendering and updating pipeline visualization
 */

import { DualConfigurationValidator } from '../dual-configuration-validator';

export class PipelineVisualization {
    private pipelineVisualizationEl: HTMLElement | null = null;
    private validator: DualConfigurationValidator;

    constructor(validator: DualConfigurationValidator) {
        this.validator = validator;
    }

    /**
     * Render pipeline visualization section
     */
    render(containerEl: HTMLElement): void {
        const vizHeader = containerEl.createEl('h4', { text: '📊 Pipeline Visualization' });
        vizHeader.style.marginTop = '25px';
        vizHeader.style.marginBottom = '10px';

        this.pipelineVisualizationEl = containerEl.createEl('div');
        this.pipelineVisualizationEl.style.marginBottom = '20px';
        this.pipelineVisualizationEl.style.padding = '15px';
        this.pipelineVisualizationEl.style.backgroundColor = 'var(--background-secondary)';
        this.pipelineVisualizationEl.style.borderRadius = '6px';
        this.pipelineVisualizationEl.style.border = '1px solid var(--background-modifier-border)';
    }

    /**
     * Update pipeline visualization
     */
    update(validationResult: any, modelsConfig: string, pipelineConfig: string): void {
        if (!this.pipelineVisualizationEl) return;

        if (!validationResult.isValid) {
            this.pipelineVisualizationEl.innerHTML = '<em>Configuration must be valid to show pipeline visualization</em>';
            return;
        }

        try {
            const resolver = this.validator.getConfigurationResolver(modelsConfig, pipelineConfig);
            const parsedPipelineConfig = JSON.parse(pipelineConfig);
            const stepIds = Object.keys(parsedPipelineConfig);
            
            let html = '<div style="margin-bottom: 15px;"><strong>Pipeline Overview:</strong></div>';
            
            // Entry points
            if (validationResult.entryPoints.length > 0) {
                html += `<div style="margin-bottom: 10px;"><strong>Entry Points:</strong> ${validationResult.entryPoints.join(', ')}</div>`;
            }
            
            // Steps table
            html += this.generateStepsTable(parsedPipelineConfig, stepIds);
            
            this.pipelineVisualizationEl.innerHTML = html;
        } catch (error) {
            this.pipelineVisualizationEl.innerHTML = '<em>Error generating pipeline visualization</em>';
        }
    }

    /**
     * Generate the steps table HTML
     */
    private generateStepsTable(pipelineConfig: any, stepIds: string[]): string {
        let html = '<table style="width: 100%; border-collapse: collapse; font-size: 14px;">';
        html += '<tr style="background-color: var(--background-modifier-border);">';
        html += '<th style="padding: 8px; text-align: left; border: 1px solid var(--background-modifier-border);">Step</th>';
        html += '<th style="padding: 8px; text-align: left; border: 1px solid var(--background-modifier-border);">Model</th>';
        html += '<th style="padding: 8px; text-align: left; border: 1px solid var(--background-modifier-border);">Input</th>';
        html += '<th style="padding: 8px; text-align: left; border: 1px solid var(--background-modifier-border);">Next Steps</th>';
        html += '</tr>';
        
        stepIds.forEach(stepId => {
            const step = pipelineConfig[stepId];
            const nextSteps = step.next ? Object.keys(step.next).join(', ') : 'None';
            
            html += `<tr>
                <td style="padding: 8px; border: 1px solid var(--background-modifier-border);">${stepId}</td>
                <td style="padding: 8px; border: 1px solid var(--background-modifier-border);">${step.modelConfig}</td>
                <td style="padding: 8px; border: 1px solid var(--background-modifier-border);">${step.input}</td>
                <td style="padding: 8px; border: 1px solid var(--background-modifier-border);">${nextSteps}</td>
            </tr>`;
        });
        
        html += '</table>';
        return html;
    }
}