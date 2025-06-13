import { Setting, Notice } from 'obsidian';
import AudioInboxPlugin from '../main';
import { DEFAULT_CATEGORIES } from '../types';
import { FileOperations } from '../core/file-operations';

/**
 * Categories section for settings
 */
export class CategoriesSection {
    private plugin: AudioInboxPlugin;
    private fileOps: FileOperations;

    constructor(plugin: AudioInboxPlugin, fileOps: FileOperations) {
        this.plugin = plugin;
        this.fileOps = fileOps;
    }

    /**
     * Render the categories section
     */
    render(containerEl: HTMLElement): void {
        containerEl.createEl('h3', { text: 'Categories' });
        
        // Categories Setting
        new Setting(containerEl)
            .setName('Default Categories')
            .setDesc('Comma-separated list of default categories to create')
            .addText(text => text
                .setPlaceholder('tasks, thoughts, uncategorized')
                .setValue(this.plugin.settings.defaultCategories.join(', '))
                .onChange(async (value) => {
                    // Parse and validate categories
                    const categories = value
                        .split(',')
                        .map((cat: string) => cat.trim())
                        .filter((cat: string) => cat.length > 0);
                    
                    this.plugin.settings.defaultCategories = categories.length > 0 
                        ? categories 
                        : [...DEFAULT_CATEGORIES];
                    await this.plugin.saveSettings();
                }))
            .addButton(button => button
                .setButtonText('Create Category Folders')
                .setTooltip('Create folders for current categories')
                .onClick(async () => {
                    button.setDisabled(true);
                    button.setButtonText('Creating...');
                    
                    try {
                        let totalCreated = 0;
                        let totalErrors = 0;
                        
                        for (const category of this.plugin.settings.defaultCategories) {
                            const result = await this.fileOps.createCategoryFolders(category);
                            totalCreated += result.foldersCreated;
                            totalErrors += result.errors.length;
                        }
                        
                        if (totalErrors === 0) {
                            new Notice(`✅ Created ${totalCreated} category folders!`, 5000);
                        } else {
                            new Notice(`⚠️ Created ${totalCreated} folders with ${totalErrors} errors`, 6000);
                        }
                        
                    } catch (error) {
                        new Notice(`❌ Failed to create category folders: ${error instanceof Error ? error.message : String(error)}`, 8000);
                    } finally {
                        button.setDisabled(false);
                        button.setButtonText('Create Category Folders');
                    }
                }));
    }
}
