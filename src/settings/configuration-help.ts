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
                <li><strong>include:</strong> Array of files to include (prompts and context)</li>
                <li><strong>apiKey:</strong> Your OpenAI API key for this step</li>
                <li><strong>next:</strong> Object mapping step IDs to routing prompts for intelligent routing</li>
                <li><strong>description:</strong> Description of what this step does (optional)</li>
            </ul>
            
            <h4>Intelligent Step Routing:</h4>
            <ul>
                <li>The LLM analyzes content and chooses the best next step automatically</li>
                <li>Configure routing with descriptive prompts that explain when to use each step</li>
                <li>Example: <code>"process-thoughts": "If the document contains personal reflections..."</code></li>
            </ul>
            
            <h4>Variables Available:</h4>
            <ul>
                <li><code>{filename}</code> - Original filename without extension</li>
                <li><code>{timestamp}</code> - Current timestamp</li>
                <li><code>{date}</code> - Current date</li>
                <li><code>{stepId}</code> - Current processing step ID</li>
            </ul>
        `;
    }
}