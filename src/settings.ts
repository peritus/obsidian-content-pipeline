import { App, PluginSettingTab } from 'obsidian';
import AudioInboxPlugin from './main';
import { AudioInboxSettings } from './types';
import { FileOperations } from './core/file-operations';
import { DEFAULT_MODELS_CONFIG, DEFAULT_PIPELINE_CONFIG } from './settings/default-config';
import { DualConfigSection } from './settings/dual-config-section';
import { FolderSetupSection } from './settings/folder-setup-section';
import { DEFAULT_CONFIGS } from '@/configs';

/**
 * Default settings for the plugin (v1.2 dual configuration)
 */
export const DEFAULT_SETTINGS: AudioInboxSettings = {
    modelsConfig: JSON.stringify(DEFAULT_MODELS_CONFIG, null, 2),
    pipelineConfig: JSON.stringify(DEFAULT_PIPELINE_CONFIG, null, 2),
    debugMode: false,
    version: '1.0.0',
    lastSaved: undefined
};

/**
 * Settings tab for the Audio Inbox plugin (v1.2 dual configuration)
 */
export class AudioInboxSettingTab extends PluginSettingTab {
    plugin: AudioInboxPlugin;
    private fileOps: FileOperations;

    constructor(app: App, plugin: AudioInboxPlugin) {
        super(app, plugin);
        this.plugin = plugin;
        this.fileOps = new FileOperations(app);
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        // Header
        containerEl.createEl('h2', { text: 'Audio Inbox Settings' });

        // Description
        const descEl = containerEl.createEl('p');
        descEl.innerHTML = `
            Configure your audio processing pipeline with intelligent step routing using the new dual configuration system. 
            <strong>Models Configuration</strong> contains private API credentials, while <strong>Pipeline Configuration</strong> 
            contains shareable workflow logic.
        `;

        // Dual Configuration Section (v1.2)
        const dualConfigSection = new DualConfigSection(this.plugin);
        dualConfigSection.render(containerEl);

        // Example Prompts Setup Section
        this.renderExamplePromptsSection(containerEl);

        // Folder Setup Section
        const folderSection = new FolderSetupSection(this.plugin, this.fileOps);
        folderSection.render(containerEl);

        // Getting Started Section
        this.renderGettingStarted(containerEl);
    }

    /**
     * Render example prompts setup section
     */
    private renderExamplePromptsSection(containerEl: HTMLElement): void {
        containerEl.createEl('h3', { text: '📝 Example Prompts Setup' });
        
        const descEl = containerEl.createEl('div');
        descEl.style.marginBottom = '20px';
        descEl.innerHTML = `
            <p style="margin-bottom: 10px;">
                Set up example prompt files in your vault to get started quickly. These prompts work with the default pipeline configuration.
            </p>
            <div style="padding: 10px; background-color: var(--background-secondary); border-radius: 4px; font-size: 14px; color: var(--text-muted);">
                💡 <strong>Note:</strong> Only missing files are shown. Existing prompts in your vault will not be overwritten.
            </div>
        `;

        // Access example prompts from bundled config
        const defaultConfig = DEFAULT_CONFIGS['default'];
        const examplePrompts = defaultConfig?.examplePrompts;

        if (!examplePrompts) {
            const errorEl = containerEl.createEl('div');
            errorEl.style.padding = '15px';
            errorEl.style.backgroundColor = '#f8d7da';
            errorEl.style.borderColor = '#f5c6cb';
            errorEl.style.color = '#721c24';
            errorEl.style.borderRadius = '6px';
            errorEl.innerHTML = '❌ <strong>Error:</strong> Example prompts not found in bundled configuration.';
            return;
        }

        // Create container for prompt status and buttons
        const promptsContainer = containerEl.createEl('div');
        promptsContainer.style.padding = '15px';
        promptsContainer.style.backgroundColor = 'var(--background-secondary)';
        promptsContainer.style.borderRadius = '6px';
        promptsContainer.style.border = '1px solid var(--background-modifier-border)';

        // Store example prompts data for later use
        (this as any).examplePrompts = examplePrompts;
        (this as any).promptsContainer = promptsContainer;

        // Initial render of prompts status
        this.updatePromptsStatus();
    }

    /**
     * Update the prompts status display
     */
    private async updatePromptsStatus(): Promise<void> {
        const promptsContainer = (this as any).promptsContainer as HTMLElement;
        const examplePrompts = (this as any).examplePrompts as Record<string, string>;
        
        if (!promptsContainer || !examplePrompts) return;

        promptsContainer.empty();

        // Check which prompts exist
        const promptsStatus: Array<{path: string, content: string, exists: boolean}> = [];
        
        for (const [promptPath, promptContent] of Object.entries(examplePrompts)) {
            const exists = await this.app.vault.adapter.exists(promptPath);
            promptsStatus.push({ path: promptPath, content: promptContent, exists });
        }

        // Count missing prompts
        const missingPrompts = promptsStatus.filter(p => !p.exists);
        const existingPrompts = promptsStatus.filter(p => p.exists);

        // Summary
        const summaryEl = promptsContainer.createEl('div');
        summaryEl.style.marginBottom = '15px';
        summaryEl.innerHTML = `
            <strong>Status:</strong> ${existingPrompts.length} prompts exist, ${missingPrompts.length} missing
        `;

        if (missingPrompts.length === 0) {
            const allExistEl = promptsContainer.createEl('div');
            allExistEl.style.padding = '10px';
            allExistEl.style.backgroundColor = '#d4edda';
            allExistEl.style.borderColor = '#c3e6cb';
            allExistEl.style.color = '#155724';
            allExistEl.style.borderRadius = '4px';
            allExistEl.innerHTML = '✅ All example prompts already exist in your vault!';
            return;
        }

        // Batch action buttons
        const batchActionsEl = promptsContainer.createEl('div');
        batchActionsEl.style.marginBottom = '15px';
        batchActionsEl.style.display = 'flex';
        batchActionsEl.style.gap = '10px';

        const createAllBtn = batchActionsEl.createEl('button', { text: `Create All Missing Prompts (${missingPrompts.length})` });
        createAllBtn.onclick = () => this.createAllMissingPrompts(missingPrompts);

        const checkAgainBtn = batchActionsEl.createEl('button', { text: 'Check Again' });
        checkAgainBtn.onclick = () => this.updatePromptsStatus();

        // Individual prompt entries
        for (const prompt of missingPrompts) {
            const promptEl = promptsContainer.createEl('div');
            promptEl.style.padding = '10px';
            promptEl.style.marginBottom = '10px';
            promptEl.style.border = '1px solid var(--background-modifier-border)';
            promptEl.style.borderRadius = '4px';
            promptEl.style.backgroundColor = 'var(--background-primary)';

            const pathEl = promptEl.createEl('div');
            pathEl.style.fontWeight = 'bold';
            pathEl.style.marginBottom = '5px';
            pathEl.textContent = prompt.path;

            const previewEl = promptEl.createEl('div');
            previewEl.style.fontSize = '12px';
            previewEl.style.color = 'var(--text-muted)';
            previewEl.style.marginBottom = '10px';
            previewEl.textContent = prompt.content.substring(0, 100) + (prompt.content.length > 100 ? '...' : '');

            const createBtn = promptEl.createEl('button', { text: `Create: ${prompt.path}` });
            createBtn.onclick = () => this.createSinglePrompt(prompt);
        }
    }

    /**
     * Create all missing prompts
     */
    private async createAllMissingPrompts(missingPrompts: Array<{path: string, content: string, exists: boolean}>): Promise<void> {
        let created = 0;
        let failed = 0;

        for (const prompt of missingPrompts) {
            try {
                await this.createPromptFile(prompt.path, prompt.content);
                created++;
            } catch (error) {
                failed++;
                console.error(`Failed to create prompt ${prompt.path}:`, error);
            }
        }

        // Show result notification
        if (failed === 0) {
            this.showNotice(`✅ Created ${created} prompt files successfully!`);
        } else {
            this.showNotice(`⚠️ Created ${created} prompts, ${failed} failed. Check console for details.`);
        }

        // Refresh the display
        await this.updatePromptsStatus();
    }

    /**
     * Create a single prompt
     */
    private async createSinglePrompt(prompt: {path: string, content: string, exists: boolean}): Promise<void> {
        try {
            await this.createPromptFile(prompt.path, prompt.content);
            this.showNotice(`✅ Created prompt: ${prompt.path}`);
            await this.updatePromptsStatus();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.showNotice(`❌ Failed to create prompt: ${errorMessage}`);
        }
    }

    /**
     * Create a prompt file with proper directory structure
     */
    private async createPromptFile(path: string, content: string): Promise<void> {
        // Ensure parent directory exists
        const pathParts = path.split('/');
        const parentPath = pathParts.slice(0, -1).join('/');
        
        if (parentPath && !(await this.app.vault.adapter.exists(parentPath))) {
            await this.app.vault.createFolder(parentPath);
        }

        // Create the file
        await this.app.vault.create(path, content);
    }

    /**
     * Show a notice to the user
     */
    private showNotice(message: string): void {
        // Use a simple approach since we don't have Notice imported
        console.log(message);
        
        // Create a temporary status element
        const statusEl = document.createElement('div');
        statusEl.style.position = 'fixed';
        statusEl.style.top = '20px';
        statusEl.style.right = '20px';
        statusEl.style.padding = '10px 15px';
        statusEl.style.backgroundColor = 'var(--background-secondary)';
        statusEl.style.border = '1px solid var(--background-modifier-border)';
        statusEl.style.borderRadius = '4px';
        statusEl.style.zIndex = '1000';
        statusEl.style.maxWidth = '300px';
        statusEl.textContent = message;

        document.body.appendChild(statusEl);

        // Remove after 3 seconds
        setTimeout(() => {
            if (statusEl.parentNode) {
                statusEl.parentNode.removeChild(statusEl);
            }
        }, 3000);
    }

    /**
     * Render getting started section with v1.2 instructions and auto-save
     */
    private renderGettingStarted(containerEl: HTMLElement): void {
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

// Export the default configs for backwards compatibility
export { DEFAULT_MODELS_CONFIG, DEFAULT_PIPELINE_CONFIG };