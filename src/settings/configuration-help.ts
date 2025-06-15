/**
 * Configuration help section renderer for v1.2 dual configuration system
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
        helpSummary.style.marginBottom = '15px';
        
        const helpContent = helpEl.createEl('div');
        helpContent.innerHTML = `
            <h4>🚀 Quick Start:</h4>
            <ol style="margin-bottom: 20px;">
                <li><strong>Load Defaults:</strong> Click "Load Default Models Config" and "Load Default Pipeline Config" buttons</li>
                <li><strong>Add API Keys:</strong> Replace empty <code>"apiKey": ""</code> fields in Models Configuration with your OpenAI API key</li>
                <li><strong>Save Configuration:</strong> Click "Save Configuration" to validate and save your settings</li>
                <li><strong>Create Folders:</strong> Click "Create Initial Folders" to set up the folder structure</li>
            </ol>
            
            <h4>🔐 Models Configuration (Private):</h4>
            <p style="margin-bottom: 10px;"><strong>Contains sensitive API credentials - never share this configuration.</strong></p>
            <ul style="margin-bottom: 20px;">
                <li><strong>baseUrl:</strong> API endpoint (e.g., "https://api.openai.com/v1")</li>
                <li><strong>apiKey:</strong> Your API key for authentication</li>
                <li><strong>implementation:</strong> Client type ("whisper", "chatgpt", or "claude")</li>
                <li><strong>model:</strong> Model name (e.g., "whisper-1", "gpt-4", "gpt-4o")</li>
                <li><strong>organization:</strong> Optional organization ID</li>
            </ul>
            
            <h4>🔄 Pipeline Configuration (Shareable):</h4>
            <p style="margin-bottom: 10px;"><strong>Contains workflow logic - safe to export and share.</strong></p>
            <ul style="margin-bottom: 20px;">
                <li><strong>modelConfig:</strong> Reference to a model config ID (e.g., "openai-gpt")</li>
                <li><strong>input:</strong> Where to find files to process</li>
                <li><strong>output:</strong> Where to save processed files</li>
                <li><strong>archive:</strong> Where to archive processed files</li>
                <li><strong>include:</strong> Array of files to include (prompts and context)</li>
                <li><strong>next:</strong> Object mapping step IDs to routing prompts for intelligent routing</li>
                <li><strong>description:</strong> Description of what this step does (optional)</li>
            </ul>
            
            <h4>🧠 Intelligent Step Routing:</h4>
            <ul style="margin-bottom: 20px;">
                <li>The LLM analyzes content and chooses the best next step automatically</li>
                <li>Configure routing with descriptive prompts that explain when to use each step</li>
                <li>Example: <code>"process-thoughts": "If the document contains personal reflections..."</code></li>
                <li>The system will include these routing options in the request to help the LLM decide</li>
            </ul>
            
            <h4>📁 Path Variables Available:</h4>
            <ul style="margin-bottom: 20px;">
                <li><code>{filename}</code> - Original filename without extension</li>
                <li><code>{timestamp}</code> - Current timestamp in ISO format</li>
                <li><code>{date}</code> - Current date in YYYY-MM-DD format</li>
                <li><code>{stepId}</code> - Current processing step ID</li>
            </ul>
            
            <h4>🔗 Cross-Reference Validation:</h4>
            <ul style="margin-bottom: 20px;">
                <li>Each pipeline step's <code>modelConfig</code> must reference a valid model config ID</li>
                <li>Model config IDs are the keys in your Models Configuration (e.g., "openai-gpt", "openai-whisper")</li>
                <li>The system validates all references and reports any missing configurations</li>
                <li>Use different model configs for cost optimization or multiple API accounts</li>
            </ul>
            
            <h4>📤 Export/Import:</h4>
            <ul style="margin-bottom: 20px;">
                <li><strong>Export Pipeline Config:</strong> Saves workflow logic without API keys for safe sharing</li>
                <li><strong>Import Pipeline Config:</strong> Loads shared workflow configurations</li>
                <li><strong>Never export Models Config</strong> - it contains sensitive API credentials</li>
                <li>Exported files include metadata and version information for compatibility</li>
            </ul>
            
            <h4>⚡ Multiple Provider Support:</h4>
            <ul style="margin-bottom: 20px;">
                <li>Configure multiple OpenAI accounts with different API keys</li>
                <li>Mix different models (GPT-4, GPT-3.5-turbo) for cost optimization</li>
                <li>Future support for Anthropic Claude and other providers</li>
                <li>Use separate billing accounts for different types of processing</li>
            </ul>
            
            <h4>🛠 Troubleshooting:</h4>
            <ul>
                <li><strong>JSON Errors:</strong> Check for missing commas, quotes, or brackets</li>
                <li><strong>Model Config References:</strong> Ensure pipeline steps reference existing model config IDs</li>
                <li><strong>API Key Issues:</strong> Verify API keys are correctly copied (no extra spaces)</li>
                <li><strong>Entry Points:</strong> At least one step should not be referenced by any other step's "next" field</li>
                <li><strong>Validation Errors:</strong> Use the validation status display for detailed error information</li>
            </ul>
        `;
    }
}