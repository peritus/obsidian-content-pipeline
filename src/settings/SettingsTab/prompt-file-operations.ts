import { App } from 'obsidian';

/**
 * Interface for prompt status tracking
 */
export interface PromptStatus {
    path: string;
    content: string;
    exists: boolean;
    error?: string;
}

/**
 * Manages prompt file operations including creation and validation
 */
export class PromptFileOperations {
    constructor(private app: App) {}

    /**
     * Check which prompts exist with error handling
     */
    async checkPromptsStatus(examplePrompts: Record<string, string>): Promise<PromptStatus[]> {
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

        return promptsStatus;
    }

    /**
     * Create a prompt file with proper directory structure and validation
     */
    async createPromptFile(path: string, content: string): Promise<void> {
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
     * Extract first few lines from content for preview
     */
    getContentPreview(content: string): string {
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
}
