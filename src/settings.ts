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
     * Render example prompts setup section with enhanced UI
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

        // Access example prompts from bundled config with error handling
        try {
            const defaultConfig = DEFAULT_CONFIGS?.['default'];
            const examplePrompts = defaultConfig?.examplePrompts;

            if (!defaultConfig) {
                this.showConfigError(containerEl, 'Default configuration not found in bundled configs');
                return;
            }

            if (!examplePrompts || typeof examplePrompts !== 'object') {
                this.showConfigError(containerEl, 'Example prompts not found in default configuration');
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

        } catch (error) {
            console.error('Error accessing example prompts:', error);
            this.showConfigError(containerEl, `Failed to load example prompts: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Show configuration error with debug information
     */
    private showConfigError(containerEl: HTMLElement, message: string): void {
        const errorEl = containerEl.createEl('div');
        errorEl.style.padding = '15px';
        errorEl.style.backgroundColor = '#f8d7da';
        errorEl.style.borderColor = '#f5c6cb';
        errorEl.style.color = '#721c24';
        errorEl.style.borderRadius = '6px';
        
        const configDebugInfo = {
            'DEFAULT_CONFIGS exists': !!DEFAULT_CONFIGS,
            'DEFAULT_CONFIGS keys': DEFAULT_CONFIGS ? Object.keys(DEFAULT_CONFIGS) : [],
            'default config exists': !!(DEFAULT_CONFIGS?.['default']),
            'default config keys': DEFAULT_CONFIGS?.['default'] ? Object.keys(DEFAULT_CONFIGS['default']) : [],
        };
        
        errorEl.innerHTML = `
            ❌ <strong>Configuration Error:</strong> ${message}
            <details style="margin-top: 10px;">
                <summary>Debug Information</summary>
                <pre style="font-size: 12px; margin-top: 10px; overflow-x: auto;">${JSON.stringify(configDebugInfo, null, 2)}</pre>
            </details>
        `;
    }

    /**
     * Extract first few lines from content for preview
     */
    private getContentPreview(content: string): string {
        if (!content) return '';
        
        // Split by lines and take first 3 lines
        const lines = content.split('\n');
        const previewLines = lines.slice(0, 3);
        
        // Join back and limit to reasonable length
        let preview = previewLines.join('\n');
        if (preview.length > 200) {
            preview = preview.substring(0, 200) + '...';
        } else if (lines.length > 3) {
            preview += '\n...';
        }
        
        return preview;
    }

    /**
     * Update the prompts status display with enhanced UI generation
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
            // Show loading state with better styling
            promptsContainer.empty();
            const loadingEl = promptsContainer.createEl('div');
            loadingEl.style.cssText = `
                padding: 30px;
                text-align: center;
                color: var(--text-muted);
                background: linear-gradient(90deg, 
                    var(--background-secondary) 25%, 
                    var(--background-primary) 50%, 
                    var(--background-secondary) 75%);
                background-size: 200% 100%;
                animation: shimmer 2s infinite;
                border-radius: 4px;
            `;
            loadingEl.innerHTML = '🔄 <strong>Checking prompt file existence...</strong><br><small>Scanning vault for existing prompts</small>';

            // Add shimmer animation
            const style = document.createElement('style');
            style.textContent = `
                @keyframes shimmer {
                    0% { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                }
            `;
            document.head.appendChild(style);

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

            // Enhanced summary with visual status indicators
            const summaryEl = promptsContainer.createEl('div');
            summaryEl.style.cssText = `
                margin-bottom: 20px;
                padding: 15px;
                background: var(--background-primary);
                border-radius: 8px;
                border: 2px solid var(--background-modifier-border);
                display: flex;
                align-items: center;
                justify-content: space-between;
                flex-wrap: wrap;
                gap: 10px;
            `;
            
            const statusText = summaryEl.createEl('div');
            statusText.innerHTML = `
                <div style="font-weight: bold; margin-bottom: 5px;">📊 Prompt Status Overview</div>
                <div style="display: flex; gap: 15px; align-items: center; flex-wrap: wrap;">
                    <span style="display: flex; align-items: center; gap: 5px;">
                        <span style="width: 12px; height: 12px; background: #28a745; border-radius: 50%; display: inline-block;"></span>
                        <strong>${existingPrompts.length}</strong> exist
                    </span>
                    <span style="display: flex; align-items: center; gap: 5px;">
                        <span style="width: 12px; height: 12px; background: #ffc107; border-radius: 50%; display: inline-block;"></span>
                        <strong>${missingPrompts.length}</strong> missing
                    </span>
                    ${errorPrompts.length > 0 ? `
                        <span style="display: flex; align-items: center; gap: 5px;">
                            <span style="width: 12px; height: 12px; background: #dc3545; border-radius: 50%; display: inline-block;"></span>
                            <strong>${errorPrompts.length}</strong> errors
                        </span>
                    ` : ''}
                </div>
            `;

            const totalInfo = summaryEl.createEl('div');
            totalInfo.style.cssText = 'font-size: 14px; color: var(--text-muted); text-align: right;';
            totalInfo.textContent = `Total: ${promptsStatus.length} prompts`;

            // Show errors if any
            if (errorPrompts.length > 0) {
                const errorEl = promptsContainer.createEl('div');
                errorEl.style.cssText = `
                    margin-bottom: 20px;
                    padding: 15px;
                    background-color: #f8d7da;
                    border: 1px solid #f5c6cb;
                    color: #721c24;
                    border-radius: 6px;
                    border-left: 4px solid #dc3545;
                `;
                errorEl.innerHTML = `
                    <strong>⚠️ Errors detected:</strong><br>
                    ${errorPrompts.map(p => `• <code>${p.path}</code>: ${p.error}`).join('<br>')}
                `;
            }

            // All prompts exist - enhanced success state
            if (missingPrompts.length === 0 && errorPrompts.length === 0) {
                const allExistEl = promptsContainer.createEl('div');
                allExistEl.style.cssText = `
                    padding: 25px;
                    background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
                    border: 2px solid #28a745;
                    color: #155724;
                    border-radius: 8px;
                    text-align: center;
                    margin-bottom: 15px;
                `;
                allExistEl.innerHTML = `
                    <div style="font-size: 18px; margin-bottom: 10px;">🎉</div>
                    <div style="font-weight: bold; font-size: 16px; margin-bottom: 8px;">All Example Prompts Ready!</div>
                    <div style="font-size: 14px; opacity: 0.8;">All ${existingPrompts.length} example prompts already exist in your vault.</div>
                `;
                
                // Add check again button with enhanced styling
                const checkAgainBtn = promptsContainer.createEl('button', { text: '🔄 Check Again' });
                checkAgainBtn.style.cssText = `
                    display: block;
                    margin: 0 auto;
                    padding: 8px 16px;
                    background: var(--interactive-accent);
                    color: var(--text-on-accent);
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: 500;
                `;
                checkAgainBtn.onclick = () => this.updatePromptsStatus();
                
                return;
            }

            // Enhanced batch action buttons for missing prompts
            if (missingPrompts.length > 0) {
                const batchActionsEl = promptsContainer.createEl('div');
                batchActionsEl.style.cssText = `
                    margin-bottom: 20px;
                    padding: 15px;
                    background: var(--background-primary);
                    border-radius: 6px;
                    border: 1px solid var(--background-modifier-border);
                `;

                const batchLabel = batchActionsEl.createEl('div');
                batchLabel.style.cssText = 'font-weight: bold; margin-bottom: 10px; color: var(--text-normal);';
                batchLabel.textContent = '⚡ Quick Actions';

                const buttonContainer = batchActionsEl.createEl('div');
                buttonContainer.style.cssText = 'display: flex; gap: 12px; flex-wrap: wrap;';

                const createAllBtn = buttonContainer.createEl('button', { 
                    text: `📝 Create All Missing Prompts (${missingPrompts.length})` 
                });
                createAllBtn.style.cssText = `
                    padding: 10px 16px;
                    background: var(--interactive-accent);
                    color: var(--text-on-accent);
                    border: none;
                    border-radius: 6px;
                    font-weight: 600;
                    cursor: pointer;
                    font-size: 14px;
                `;
                createAllBtn.onclick = () => this.createAllMissingPrompts(missingPrompts);

                const checkAgainBtn = buttonContainer.createEl('button', { text: '🔄 Check Again' });
                checkAgainBtn.style.cssText = `
                    padding: 10px 16px;
                    background: var(--background-secondary);
                    color: var(--text-normal);
                    border: 1px solid var(--background-modifier-border);
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 14px;
                `;
                checkAgainBtn.onclick = () => this.updatePromptsStatus();

                // Enhanced individual prompt entries
                const promptsListLabel = promptsContainer.createEl('div');
                promptsListLabel.style.cssText = `
                    font-weight: bold; 
                    margin-bottom: 15px; 
                    color: var(--text-normal);
                    font-size: 16px;
                `;
                promptsListLabel.textContent = '📋 Missing Prompts';

                for (const prompt of missingPrompts) {
                    const promptEl = promptsContainer.createEl('div');
                    promptEl.style.cssText = `
                        margin-bottom: 15px;
                        border: 1px solid var(--background-modifier-border);
                        border-radius: 8px;
                        overflow: hidden;
                        background: var(--background-primary);
                        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                    `;

                    // Header with file path and status
                    const headerEl = promptEl.createEl('div');
                    headerEl.style.cssText = `
                        padding: 12px 15px;
                        background: var(--background-secondary);
                        border-bottom: 1px solid var(--background-modifier-border);
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        flex-wrap: wrap;
                        gap: 10px;
                    `;

                    const pathEl = headerEl.createEl('div');
                    pathEl.style.cssText = `
                        font-weight: bold;
                        color: var(--text-accent);
                        font-family: var(--font-monospace);
                        font-size: 14px;
                    `;
                    pathEl.textContent = prompt.path;

                    const statusBadge = headerEl.createEl('span');
                    statusBadge.style.cssText = `
                        background: #ffc107;
                        color: #856404;
                        padding: 4px 8px;
                        border-radius: 12px;
                        font-size: 12px;
                        font-weight: 600;
                    `;
                    statusBadge.textContent = 'MISSING';

                    // Content preview section
                    const contentEl = promptEl.createEl('div');
                    contentEl.style.cssText = 'padding: 15px;';

                    const previewLabel = contentEl.createEl('div');
                    previewLabel.style.cssText = `
                        font-size: 13px;
                        color: var(--text-muted);
                        margin-bottom: 8px;
                        font-weight: 500;
                    `;
                    previewLabel.textContent = '📄 Content Preview:';
                    
                    const previewEl = contentEl.createEl('div');
                    previewEl.style.cssText = `
                        font-size: 13px;
                        color: var(--text-muted);
                        line-height: 1.5;
                        font-family: var(--font-monospace);
                        background: var(--background-secondary);
                        padding: 12px;
                        border-radius: 6px;
                        border-left: 3px solid var(--interactive-accent);
                        white-space: pre-line;
                        margin-bottom: 15px;
                        max-height: 120px;
                        overflow-y: auto;
                    `;
                    previewEl.textContent = this.getContentPreview(prompt.content);

                    // Action buttons section
                    const actionsEl = contentEl.createEl('div');
                    actionsEl.style.cssText = `
                        display: flex;
                        gap: 12px;
                        align-items: center;
                        justify-content: space-between;
                        flex-wrap: wrap;
                    `;

                    const createBtn = actionsEl.createEl('button', { 
                        text: `Create example prompt: ${prompt.path}` 
                    });
                    createBtn.style.cssText = `
                        padding: 10px 16px;
                        background: var(--interactive-accent);
                        color: var(--text-on-accent);
                        border: none;
                        border-radius: 6px;
                        font-weight: 600;
                        cursor: pointer;
                        font-size: 14px;
                        flex: 1;
                        min-width: 200px;
                    `;
                    createBtn.onclick = () => this.createSinglePrompt(prompt);

                    const metaInfo = actionsEl.createEl('div');
                    metaInfo.style.cssText = `
                        display: flex;
                        flex-direction: column;
                        gap: 2px;
                        font-size: 12px;
                        color: var(--text-muted);
                        text-align: right;
                    `;
                    
                    const sizeInfo = metaInfo.createEl('span');
                    sizeInfo.textContent = `${prompt.content.length} characters`;
                    
                    const linesInfo = metaInfo.createEl('span');
                    linesInfo.textContent = `${prompt.content.split('\n').length} lines`;
                }
            }
        } catch (error) {
            // Handle overall errors with enhanced error display
            promptsContainer.empty();
            const errorEl = promptsContainer.createEl('div');
            errorEl.style.cssText = `
                padding: 20px;
                background: linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%);
                border: 2px solid #dc3545;
                color: #721c24;
                border-radius: 8px;
                text-align: center;
            `;
            errorEl.innerHTML = `
                <div style="font-size: 18px; margin-bottom: 10px;">⚠️</div>
                <div style="font-weight: bold; margin-bottom: 8px;">Error Checking Prompts</div>
                <div style="font-size: 14px; opacity: 0.8;">${error instanceof Error ? error.message : String(error)}</div>
            `;
            
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