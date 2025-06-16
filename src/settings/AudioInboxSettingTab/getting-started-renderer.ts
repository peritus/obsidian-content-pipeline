/**
 * Renders the getting started section with v1.2 instructions
 */
export class GettingStartedRenderer {
    /**
     * Render getting started section with v1.2 instructions and auto-save
     */
    static render(containerEl: HTMLElement): void {
        containerEl.createEl('h3', { text: 'Getting Started' });
        
        const instructionsEl = containerEl.createEl('div');
        instructionsEl.innerHTML = `
            <ol>
                <li><strong>Load Default Configurations:</strong> Click the "Load Default" buttons for both Models and Pipeline configurations</li>
                <li><strong>Create Example Prompts:</strong> Use the "Example Prompts Setup" section to create prompt files in your vault</li>
                <li><strong>Add API Keys:</strong> Replace empty API key fields in the Models Configuration with your OpenAI API key</li>
                <li><strong>Auto-Save:</strong> Changes are automatically saved as you type after validation completes successfully</li>
                <li><strong>Create Folders:</strong> Click "Create Initial Folders" to set up the inbox structure</li>
                <li><strong>Add Audio Files:</strong> Place audio files in <code>inbox/audio/</code> folder</li>
                <li><strong>Process Files:</strong> Use the "Process Next File" command from the command palette or ribbon icon</li>
            </ol>
            
            <div style="margin-top: 15px; padding: 15px; background-color: var(--background-secondary); border-radius: 6px; border-left: 4px solid var(--interactive-accent);">
                <h4 style="margin-top: 0;">🔒 Security & Sharing</h4>
                <ul style="margin-bottom: 0;">
                    <li><strong>Models Configuration:</strong> Contains API keys - keep private, never share</li>
                    <li><strong>Pipeline Configuration:</strong> Contains workflow logic - safe to export and share with team</li>
                    <li><strong>Cross-Reference Validation:</strong> Ensures pipeline steps reference valid model configurations</li>
                    <li><strong>Multiple Providers:</strong> Support for different API accounts and cost optimization</li>
                </ul>
            </div>
            
            <div style="margin-top: 15px; padding: 15px; background-color: var(--background-secondary); border-radius: 6px;">
                <h4 style="margin-top: 0;">🎯 Key Features</h4>
                <ul style="margin-bottom: 0;">
                    <li><strong>Auto-Save:</strong> Changes automatically saved to memory and disk after successful validation</li>
                    <li><strong>Real-time Validation:</strong> Both configurations validated with detailed error reporting</li>
                    <li><strong>Pipeline Visualization:</strong> Visual overview of your processing workflow</li>
                    <li><strong>Export/Import:</strong> Share pipeline configurations safely without exposing credentials</li>
                    <li><strong>Intelligent Routing:</strong> LLM chooses optimal next processing steps based on content</li>
                    <li><strong>Example Prompts:</strong> Pre-built prompts to get you started immediately</li>
                </ul>
            </div>
        `;
    }
}