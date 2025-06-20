/**
 * Pipeline visualization component - handles rendering and updating pipeline visualization
 */

import { createConfigurationResolver } from '../validation/configuration-resolver';
import { isRoutingAwareOutput } from '../types';

export class PipelineVisualization {
    private pipelineVisualizationEl: HTMLElement | null = null;

    /**
     * Render pipeline visualization section
     */
    render(containerEl: HTMLElement): void {
        const vizHeader = containerEl.createEl('h4', { 
            text: '📊 Pipeline Visualization',
            cls: 'content-pipeline-viz-header'
        });

        this.pipelineVisualizationEl = containerEl.createEl('div', {
            cls: 'content-pipeline-viz-container'
        });
    }

    /**
     * Update pipeline visualization
     */
    update(modelsConfig: string, pipelineConfig: string): void {
        if (!this.pipelineVisualizationEl) return;

        try {
            const resolver = createConfigurationResolver(modelsConfig, pipelineConfig);
            const validationResult = resolver.validate();

            if (!validationResult.isValid) {
                this.pipelineVisualizationEl.innerHTML = '<em>Configuration must be valid to show pipeline visualization</em>';
                return;
            }

            const parsedPipelineConfig = JSON.parse(pipelineConfig);
            const stepIds = Object.keys(parsedPipelineConfig);
            
            let html = '<div class="content-pipeline-viz-overview"><strong>Pipeline Overview:</strong></div>';
            
            // Entry points
            if (validationResult.entryPoints.length > 0) {
                html += `<div class="content-pipeline-viz-entry-points"><strong>Entry Points:</strong> ${validationResult.entryPoints.join(', ')}</div>`;
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
        let html = '<table class="content-pipeline-viz-table">';
        html += '<tr>';
        html += '<th>Step</th>';
        html += '<th>Model</th>';
        html += '<th>Input</th>';
        html += '<th>Next Steps</th>';
        html += '</tr>';
        
        stepIds.forEach(stepId => {
            const step = pipelineConfig[stepId];
            
            // Get next steps from routing-aware output
            let nextSteps = 'None';
            if (step.routingAwareOutput && isRoutingAwareOutput(step.routingAwareOutput)) {
                const routes = Object.keys(step.routingAwareOutput).filter(key => key !== 'default');
                nextSteps = routes.length > 0 ? routes.join(', ') : 'None';
            }
            
            html += `<tr>
                <td>${stepId}</td>
                <td>${step.modelConfig}</td>
                <td>${step.input}</td>
                <td>${nextSteps}</td>
            </tr>`;
        });
        
        html += '</table>';
        return html;
    }
}