import { App } from 'obsidian';
import { PromptFileOperations, PromptStatus } from './prompt-file-operations';
import { NotificationManager } from './notification-manager';
import { DEFAULT_CONFIGS } from '@/configs';

/**
 * Manages the example prompts setup section with enhanced UI
 */
export class ExamplePromptsManager {
    private isCheckingPrompts = false;
    private promptsContainer?: HTMLElement;
    private examplePrompts?: Record<string, string>;
    private fileOps: PromptFileOperations;

    constructor(private app: App) {
        this.fileOps = new PromptFileOperations(app);
    }

    /**
     * Render example prompts setup section with enhanced UI
     */
    render(containerEl: HTMLElement): void {
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
            this.promptsContainer = containerEl.createEl('div');
            this.promptsContainer.style.padding = '15px';
            this.promptsContainer.style.backgroundColor = 'var(--background-secondary)';
            this.promptsContainer.style.borderRadius = '6px';
            this.promptsContainer.style.border = '1px solid var(--background-modifier-border)';

            // Store example prompts data for later use
            this.examplePrompts = examplePrompts;

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
     * Update the prompts status display with enhanced UI generation
     */
    private async updatePromptsStatus(): Promise<void> {
        if (!this.promptsContainer || !this.examplePrompts) {
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
            this.promptsContainer.empty();
            const loadingEl = this.promptsContainer.createEl('div');
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
            const promptsStatus = await this.fileOps.checkPromptsStatus(this.examplePrompts);

            // Clear loading state
            this.promptsContainer.empty();

            // Separate prompts by status
            const missingPrompts = promptsStatus.filter(p => !p.exists && !p.error);
            const existingPrompts = promptsStatus.filter(p => p.exists);
            const errorPrompts = promptsStatus.filter(p => p.error);

            this.renderStatusSummary(missingPrompts, existingPrompts, errorPrompts);
            this.renderErrorPrompts(errorPrompts);
            
            if (missingPrompts.length === 0 && errorPrompts.length === 0) {
                this.renderAllExistState(existingPrompts);
            } else if (missingPrompts.length > 0) {
                this.renderMissingPrompts(missingPrompts);
            }

        } catch (error) {
            this.handleOverallError(error);
        } finally {
            this.isCheckingPrompts = false;
        }
    }

    /**
     * Render status summary section
     */
    private renderStatusSummary(missingPrompts: PromptStatus[], existingPrompts: PromptStatus[], errorPrompts: PromptStatus[]): void {
        if (!this.promptsContainer) return;

        const summaryEl = this.promptsContainer.createEl('div');
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
        totalInfo.textContent = `Total: ${missingPrompts.length + existingPrompts.length + errorPrompts.length} prompts`;
    }

    /**
     * Create all missing prompts with improved error reporting
     */
    private async createAllMissingPrompts(missingPrompts: PromptStatus[]): Promise<void> {
        let created = 0;
        let failed = 0;
        const errors: string[] = [];

        NotificationManager.showNotice('🔄 Creating prompt files...');

        for (const prompt of missingPrompts) {
            try {
                await this.fileOps.createPromptFile(prompt.path, prompt.content);
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
            NotificationManager.showNotice(`✅ Successfully created all ${created} prompt files!`);
        } else {
            NotificationManager.showNotice(`⚠️ Created ${created} prompts, ${failed} failed. Check console for details.`);
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
            NotificationManager.showNotice(`🔄 Creating ${prompt.path}...`);
            await this.fileOps.createPromptFile(prompt.path, prompt.content);
            NotificationManager.showNotice(`✅ Created prompt: ${prompt.path}`);
            await this.updatePromptsStatus();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            NotificationManager.showNotice(`❌ Failed to create ${prompt.path}: ${errorMessage}`);
            console.error(`Failed to create prompt ${prompt.path}:`, error);
        }
    }

    /**
     * Render error prompts section
     */
    private renderErrorPrompts(errorPrompts: PromptStatus[]): void {
        if (!this.promptsContainer || errorPrompts.length === 0) return;

        const errorEl = this.promptsContainer.createEl('div');
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

    /**
     * Render all prompts exist state
     */
    private renderAllExistState(existingPrompts: PromptStatus[]): void {
        if (!this.promptsContainer) return;

        const allExistEl = this.promptsContainer.createEl('div');
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
        const checkAgainBtn = this.promptsContainer.createEl('button', { text: '🔄 Check Again' });
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
    }

    /**
     * Render missing prompts section with batch actions and individual prompts
     */
    private renderMissingPrompts(missingPrompts: PromptStatus[]): void {
        if (!this.promptsContainer) return;

        this.renderBatchActions(missingPrompts);
        this.renderIndividualPrompts(missingPrompts);
    }

    /**
     * Render batch action buttons for missing prompts
     */
    private renderBatchActions(missingPrompts: PromptStatus[]): void {
        if (!this.promptsContainer) return;

        const batchActionsEl = this.promptsContainer.createEl('div');
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
    }

    /**
     * Render individual missing prompts
     */
    private renderIndividualPrompts(missingPrompts: PromptStatus[]): void {
        if (!this.promptsContainer) return;

        const promptsListLabel = this.promptsContainer.createEl('div');
        promptsListLabel.style.cssText = `
            font-weight: bold; 
            margin-bottom: 15px; 
            color: var(--text-normal);
            font-size: 16px;
        `;
        promptsListLabel.textContent = '📋 Missing Prompts';

        for (const prompt of missingPrompts) {
            this.renderIndividualPrompt(prompt);
        }
    }

    /**
     * Render a single individual prompt entry
     */
    private renderIndividualPrompt(prompt: PromptStatus): void {
        if (!this.promptsContainer) return;

        const promptEl = this.promptsContainer.createEl('div');
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

        // Content preview and actions
        this.renderPromptContent(promptEl, prompt);
    }

    /**
     * Render prompt content preview and actions
     */
    private renderPromptContent(promptEl: HTMLElement, prompt: PromptStatus): void {
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
        previewEl.textContent = this.fileOps.getContentPreview(prompt.content);

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

    /**
     * Handle overall errors with enhanced error display
     */
    private handleOverallError(error: unknown): void {
        if (!this.promptsContainer) return;

        this.promptsContainer.empty();
        const errorEl = this.promptsContainer.createEl('div');
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
    }
}