/**
 * Configuration help section renderer
 */
export class ConfigurationHelp {
    /**
     * Render the help section
     */
    static render(containerEl: HTMLElement): void {
        const helpEl = containerEl.createEl('details');
        helpEl.style.marginBottom = '20px';
        const helpSummary = helpEl.createEl('summary');
        helpSummary.textContent = '📖 Configuration Help';
        helpSummary.style.cursor = 'pointer';
        helpSummary.style.fontWeight = 'bold';
        
        const helpContent = helpEl.createEl('div');
        helpContent.innerHTML = `
            <h4>Quick Start:</h4>
            <ol>
                <li><strong>Add API Keys:</strong> Replace empty <code>"apiKey": ""</code> fields with your OpenAI API key</li>
                <li><strong>Keep Default Structure:</strong> The default configuration works for most users</li>
                <li><strong>Customize Models:</strong> Change model names if needed (e.g., "gpt-4o", "gpt-3.5-turbo")</li>
            </ol>
            
            <h4>Configuration Structure:</h4>
            <ul>
                <li><strong>model:</strong> AI model to use (whisper-1, gpt-4, etc.)</li>
                <li><strong>input:</strong> Where to find files to process</li>
                <li><strong>output:</strong> Where to save processed files</li>
                <li><strong>template:</strong> Template file for formatting output</li>
                <li><strong>apiKey:</strong> Your OpenAI API key for this step</li>
                <li><strong>next:</strong> Next step in the pipeline (optional)</li>
            </ul>
            
            <h4>Variables Available:</h4>
            <ul>
                <li><code>{category}</code> - File category (tasks, thoughts, etc.)</li>
                <li><code>{filename}</code> - Original filename without extension</li>
            </ul>
        `;
    }
}
