import { App, PluginSettingTab } from 'obsidian';
import AudioInboxPlugin from './main';
import { AudioInboxSettings } from './types';
import { FileOperations } from './core/file-operations';
import { DEFAULT_MODELS_CONFIG, DEFAULT_PIPELINE_CONFIG } from './settings/default-config';
import { DualConfigSection } from './settings/dual-config-section';
import { FolderSetupSection } from './settings/folder-setup-section';
import { DEFAULT_CONFIGS } from '@/configs';

/**
 * Interface for prompt status tracking
 */
interface PromptStatus {
    path: string;
    content: string;
    exists: boolean;
    error?: string;
}

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
    private isCheckingPrompts = false;

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

        // Validate example prompts structure
        if (Object.keys(examplePrompts).length === 0) {
            const warningEl = containerEl.createEl('div');
            warningEl.style.padding = '15px';
            warningEl.style.backgroundColor = '#fff3cd';
            warningEl.style.borderColor = '#ffeaa7';
            warningEl.style.color = '#856404';
            warningEl.style.borderRadius = '6px';
            warningEl.innerHTML = '⚠️ <strong>Warning:</strong> No example prompts found in configuration.';
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
     * Update the prompts status display with improved error handling
     */
    private async updatePromptsStatus(): Promise<void> {
        const promptsContainer = (this as any).promptsContainer as HTMLElement;
        const examplePrompts = (this as any).examplePrompts as Record<string, string>;
        
        if (!promptsContainer || !examplePrompts) {
            console.error('PromptsContainer or examplePrompts not available');
            return;
        }

        // Prevent concurrent checks
        if (this.isCheckingPrompts) {
            return;
        }

        this.isCheckingPrompts = true;

        try {
            // Show loading state
            promptsContainer.empty();
            const loadingEl = promptsContainer.createEl('div');
            loadingEl.style.padding = '20px';
            loadingEl.style.textAlign = 'center';
            loadingEl.style.color = 'var(--text-muted)';
            loadingEl.innerHTML = '🔄 Checking prompt file existence...';

            // Check which prompts exist with error handling
            const promptsStatus: PromptStatus[] = [];
            
            for (const [promptPath, promptContent] of Object.entries(examplePrompts)) {
                try {
                    // Validate path format
                    if (!promptPath || typeof promptPath !== 'string' || promptPath.trim() === '') {
                        promptsStatus.push({ 
                            path: promptPath || 'invalid-path', 
                            content: promptContent, 
                            exists: false, 
                            error: 'Invalid file path' 
                        });
                        continue;
                    }

                    // Validate content
                    if (typeof promptContent !== 'string') {
                        promptsStatus.push({ 
                            path: promptPath, 
                            content: '', 
                            exists: false, 
                            error: 'Invalid prompt content' 
                        });
                        continue;
                    }

                    // Check file existence
                    const exists = await this.app.vault.adapter.exists(promptPath);
                    promptsStatus.push({ path: promptPath, content: promptContent, exists });
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    promptsStatus.push({ 
                        path: promptPath, 
                        content: promptContent, 
                        exists: false, 
                        error: `Check failed: ${errorMessage}` 
                    });
                    console.error(`Error checking existence of ${promptPath}:`, error);
                }
            }

            // Clear loading state
            promptsContainer.empty();

            // Separate prompts by status
            const missingPrompts = promptsStatus.filter(p => !p.exists && !p.error);
            const existingPrompts = promptsStatus.filter(p => p.exists);
            const errorPrompts = promptsStatus.filter(p => p.error);

            // Summary with enhanced status information
            const summaryEl = promptsContainer.createEl('div');
            summaryEl.style.marginBottom = '15px';
            summaryEl.style.padding = '10px';
            summaryEl.style.backgroundColor = 'var(--background-primary)';
            summaryEl.style.borderRadius = '4px';
            summaryEl.style.border = '1px solid var(--background-modifier-border)';
            
            let summaryText = `<strong>Status:</strong> ${existingPrompts.length} exist, ${missingPrompts.length} missing`;
            if (errorPrompts.length > 0) {
                summaryText += `, ${errorPrompts.length} errors`;
            }
            summaryText += ` (Total: ${promptsStatus.length} prompts)`;
            summaryEl.innerHTML = summaryText;

            // Show errors if any
            if (errorPrompts.length > 0) {
                const errorEl = promptsContainer.createEl('div');
                errorEl.style.marginBottom = '15px';
                errorEl.style.padding = '10px';
                errorEl.style.backgroundColor = '#f8d7da';
                errorEl.style.borderColor = '#f5c6cb';
                errorEl.style.color = '#721c24';
                errorEl.style.borderRadius = '4px';
                errorEl.innerHTML = `
                    <strong>⚠️ Errors detected:</strong><br>
                    ${errorPrompts.map(p => `• ${p.path}: ${p.error}`).join('<br>')}
                `;
            }

            // All prompts exist - success state
            if (missingPrompts.length === 0 && errorPrompts.length === 0) {
                const allExistEl = promptsContainer.createEl('div');
                allExistEl.style.padding = '15px';
                allExistEl.style.backgroundColor = '#d4edda';
                allExistEl.style.borderColor = '#c3e6cb';
                allExistEl.style.color = '#155724';
                allExistEl.style.borderRadius = '4px';
                allExistEl.style.textAlign = 'center';
                allExistEl.innerHTML = '✅ <strong>All example prompts already exist in your vault!</strong>';
                
                // Add check again button even when all exist
                const checkAgainBtn = promptsContainer.createEl('button', { text: 'Check Again' });
                checkAgainBtn.style.marginTop = '10px';
                checkAgainBtn.style.display = 'block';
                checkAgainBtn.style.margin = '10px auto 0 auto';
                checkAgainBtn.onclick = () => this.updatePromptsStatus();
                
                return;
            }

            // Batch action buttons for missing prompts
            if (missingPrompts.length > 0) {
                const batchActionsEl = promptsContainer.createEl('div');
                batchActionsEl.style.marginBottom = '15px';
                batchActionsEl.style.display = 'flex';
                batchActionsEl.style.gap = '10px';
                batchActionsEl.style.flexWrap = 'wrap';

                const createAllBtn = batchActionsEl.createEl('button', { 
                    text: `Create All Missing Prompts (${missingPrompts.length})` 
                });
                createAllBtn.style.backgroundColor = 'var(--interactive-accent)';
                createAllBtn.style.color = 'var(--text-on-accent)';
                createAllBtn.onclick = () => this.createAllMissingPrompts(missingPrompts);

                const checkAgainBtn = batchActionsEl.createEl('button', { text: 'Check Again' });
                checkAgainBtn.onclick = () => this.updatePromptsStatus();

                // Individual prompt entries with enhanced display
                for (const prompt of missingPrompts) {
                    const promptEl = promptsContainer.createEl('div');
                    promptEl.style.padding = '12px';
                    promptEl.style.marginBottom = '10px';
                    promptEl.style.border = '1px solid var(--background-modifier-border)';
                    promptEl.style.borderRadius = '6px';
                    promptEl.style.backgroundColor = 'var(--background-primary)';

                    const pathEl = promptEl.createEl('div');
                    pathEl.style.fontWeight = 'bold';
                    pathEl.style.marginBottom = '8px';
                    pathEl.style.color = 'var(--text-accent)';
                    pathEl.textContent = prompt.path;

                    const previewEl = promptEl.createEl('div');
                    previewEl.style.fontSize = '13px';
                    previewEl.style.color = 'var(--text-muted)';
                    previewEl.style.marginBottom = '10px';
                    previewEl.style.lineHeight = '1.4';
                    previewEl.style.fontFamily = 'var(--font-monospace)';
                    previewEl.style.backgroundColor = 'var(--background-secondary)';
                    previewEl.style.padding = '8px';
                    previewEl.style.borderRadius = '4px';
                    
                    const preview = prompt.content.substring(0, 150);
                    previewEl.textContent = preview + (prompt.content.length > 150 ? '...' : '');

                    const buttonContainer = promptEl.createEl('div');
                    buttonContainer.style.display = 'flex';
                    buttonContainer.style.gap = '8px';
                    buttonContainer.style.alignItems = 'center';

                    const createBtn = buttonContainer.createEl('button', { 
                        text: `Create ${prompt.path.split('/').pop()}` 
                    });
                    createBtn.style.backgroundColor = 'var(--interactive-accent)';
                    createBtn.style.color = 'var(--text-on-accent)';
                    createBtn.onclick = () => this.createSinglePrompt(prompt);

                    const sizeInfo = buttonContainer.createEl('span');
                    sizeInfo.style.fontSize = '12px';
                    sizeInfo.style.color = 'var(--text-muted)';
                    sizeInfo.textContent = `(${prompt.content.length} characters)`;
                }
            }
        } catch (error) {
            // Handle overall errors
            promptsContainer.empty();
            const errorEl = promptsContainer.createEl('div');
            errorEl.style.padding = '15px';
            errorEl.style.backgroundColor = '#f8d7da';
            errorEl.style.borderColor = '#f5c6cb';
            errorEl.style.color = '#721c24';
            errorEl.style.borderRadius = '6px';
            errorEl.innerHTML = `❌ <strong>Error checking prompts:</strong> ${error instanceof Error ? error.message : String(error)}`;
            
            console.error('Error in updatePromptsStatus:', error);
        } finally {
            this.isCheckingPrompts = false;
        }
    }

    /**
     * Create all missing prompts with improved error reporting
     */
    private async createAllMissingPrompts(missingPrompts: PromptStatus[]): Promise<void> {
        let created = 0;
        let failed = 0;
        const errors: string[] = [];

        this.showNotice('🔄 Creating prompt files...');

        for (const prompt of missingPrompts) {
            try {
                await this.createPromptFile(prompt.path, prompt.content);
                created++;
            } catch (error) {
                failed++;
                const errorMessage = error instanceof Error ? error.message : String(error);
                errors.push(`${prompt.path}: ${errorMessage}`);
                console.error(`Failed to create prompt ${prompt.path}:`, error);
            }
        }

        // Show detailed result notification
        if (failed === 0) {
            this.showNotice(`✅ Successfully created all ${created} prompt files!`);
        } else {
            this.showNotice(`⚠️ Created ${created} prompts, ${failed} failed. Check console for details.`);
            console.error('Failed prompt creations:', errors);
        }

        // Refresh the display
        await this.updatePromptsStatus();
    }

    /**
     * Create a single prompt with enhanced error handling
     */
    private async createSinglePrompt(prompt: PromptStatus): Promise<void> {
        try {
            this.showNotice(`🔄 Creating ${prompt.path}...`);
            await this.createPromptFile(prompt.path, prompt.content);
            this.showNotice(`✅ Created prompt: ${prompt.path}`);
            await this.updatePromptsStatus();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.showNotice(`❌ Failed to create ${prompt.path}: ${errorMessage}`);
            console.error(`Failed to create prompt ${prompt.path}:`, error);
        }
    }

    /**
     * Create a prompt file with proper directory structure and validation
     */
    private async createPromptFile(path: string, content: string): Promise<void> {
        // Validate inputs
        if (!path || typeof path !== 'string' || path.trim() === '') {
            throw new Error('Invalid file path provided');
        }

        if (typeof content !== 'string') {
            throw new Error('Invalid content provided');
        }

        // Normalize path separators
        const normalizedPath = path.replace(/\\/g, '/');
        
        // Check if file already exists
        if (await this.app.vault.adapter.exists(normalizedPath)) {
            throw new Error('File already exists');
        }

        // Ensure parent directory exists
        const pathParts = normalizedPath.split('/');
        const parentPath = pathParts.slice(0, -1).join('/');
        
        if (parentPath && !(await this.app.vault.adapter.exists(parentPath))) {
            try {
                await this.app.vault.createFolder(parentPath);
            } catch (error) {
                if (error instanceof Error && !error.message.includes('already exists')) {
                    throw new Error(`Failed to create directory ${parentPath}: ${error.message}`);
                }
                // Directory already exists, continue
            }
        }

        // Create the file
        try {
            await this.app.vault.create(normalizedPath, content);
        } catch (error) {
            if (error instanceof Error) {
                throw new Error(`Failed to create file: ${error.message}`);
            }
            throw error;
        }
    }

    /**
     * Show a notice to the user with enhanced styling
     */
    private showNotice(message: string): void {
        console.log(`[Audio Inbox] ${message}`);
        
        // Create a temporary status element with better styling
        const statusEl = document.createElement('div');
        statusEl.style.cssText = `
            position: fixed;
            top: 50px;
            right: 20px;
            padding: 12px 16px;
            background-color: var(--background-secondary);
            border: 1px solid var(--background-modifier-border);
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 1000;
            max-width: 350px;
            font-size: 14px;
            line-height: 1.4;
            color: var(--text-normal);
        `;
        statusEl.textContent = message;

        document.body.appendChild(statusEl);

        // Remove after 4 seconds with fade out
        setTimeout(() => {
            statusEl.style.opacity = '0.5';
            statusEl.style.transition = 'opacity 0.3s ease';
            
            setTimeout(() => {
                if (statusEl.parentNode) {
                    statusEl.parentNode.removeChild(statusEl);
                }
            }, 300);
        }, 4000);
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