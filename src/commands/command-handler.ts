/**
 * Command handlers for Content Pipeline plugin
 * 
 * Centralizes all command logic and processing operations.
 */

import { App, Notice, TFile } from 'obsidian';
import { ContentPipelineSettings, ProcessingStatus } from '../types';
import { PipelineExecutor } from '../core/pipeline-executor';
import { FileDiscovery } from '../core/file-operations';
import { 
    validateSettingsConfigurations,
    getSafePipelineConfiguration
} from '../validation';
import { createLogger } from '../logger';

const logger = createLogger('CommandHandler');

export class CommandHandler {
    private app: App;
    private settings: ContentPipelineSettings;

    constructor(app: App, settings: ContentPipelineSettings) {
        this.app = app;
        this.settings = settings;
    }

    /**
     * Check if a specific file can be processed using the existing discovery system
     */
    async canFileBeProcessed(file: TFile): Promise<boolean> {
        try {
            // Check configuration validity using centralized validation functions
            const validationResult = validateSettingsConfigurations(this.settings);
            if (!validationResult.isValid) {
                return false;
            }

            const pipelineConfig = getSafePipelineConfiguration(this.settings);
            if (!pipelineConfig) {
                return false;
            }

            // Use the unified FileDiscovery system
            const fileDiscovery = new FileDiscovery(this.app);
            return await fileDiscovery.canFileBeProcessed(file, pipelineConfig);

        } catch (error) {
            logger.warn('Error checking if file can be processed:', error);
            return false;
        }
    }

    /**
     * Process a specific file with Intelligent Processing
     */
    async processSpecificFile(file: TFile): Promise<void> {
        try {
            logger.info(`Process specific file command triggered for: ${file.path}`);
            
            // Check if both configurations are available and valid using centralized validation functions
            const validationResult = validateSettingsConfigurations(this.settings);
            if (!validationResult.isValid) {
                new Notice(`❌ Configuration invalid: ${validationResult.error}. Please check settings.`, 8000);
                logger.error('Configuration validation failed:', validationResult.error);
                return;
            }

            // Intelligent Processing: Find the appropriate step for this file
            const stepId = await this.findStepForFile(file);
            if (!stepId) {
                new Notice(`❌ Could not determine processing step for file: ${file.name}`, 8000);
                logger.error(`No step found for file: ${file.path}`);
                return;
            }

            // Show processing started notification
            new Notice(`🔄 Processing file: ${file.name}...`, 3000);
            
            // Create file info object
            const fileInfo = await this.createFileInfo(file);
            
            // Create executor and process specific file
            const executor = new PipelineExecutor(this.app, this.settings);
            const result = await executor.executeStep(stepId, fileInfo);
            
            // Handle result based on status
            this.handleProcessingResult(result, `file: ${file.name}`);
            
        } catch (error) {
            logger.error('Process specific file command failed:', error);
            
            // Show user-friendly error message
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            new Notice(`❌ Failed to process file: ${errorMessage}`, 8000);
            
            // Log detailed error information
            logger.error('Command execution error details:', {
                error: errorMessage,
                stack: error instanceof Error ? error.stack : undefined,
                filePath: file.path
            });
        }
    }

    /**
     * Process the next available file in the pipeline
     */
    async processNextFile(): Promise<void> {
        try {
            logger.info('Process Next File command triggered');
            
            // Check if both configurations are available and valid using centralized validation functions
            const validationResult = validateSettingsConfigurations(this.settings);
            if (!validationResult.isValid) {
                new Notice(`❌ Configuration invalid: ${validationResult.error}. Please check settings.`, 8000);
                logger.error('Configuration validation failed:', validationResult.error);
                return;
            }

            // Show processing started notification
            new Notice('🔄 Processing next file...', 3000);
            
            // Create executor and process file
            const executor = new PipelineExecutor(this.app, this.settings);
            const result = await executor.processNextFile();
            
            // Handle result based on status
            this.handleProcessingResult(result, 'next available file');
            
        } catch (error) {
            logger.error('Process Next File command failed:', error);
            
            // Show user-friendly error message
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            new Notice(`❌ Failed to process file: ${errorMessage}`, 8000);
            
            // Log detailed error information
            logger.error('Command execution error details:', {
                error: errorMessage,
                stack: error instanceof Error ? error.stack : undefined
            });
        }
    }

    /**
     * Process all available files automatically until none remain
     */
    async processAllFiles(): Promise<void> {
        try {
            logger.info('Process All Files command triggered');
            
            // Check if both configurations are available and valid using centralized validation functions
            const validationResult = validateSettingsConfigurations(this.settings);
            if (!validationResult.isValid) {
                new Notice(`❌ Configuration invalid: ${validationResult.error}. Please check settings.`, 8000);
                logger.error('Configuration validation failed:', validationResult.error);
                return;
            }

            // Show processing started notification
            new Notice('🔄 Processing all files...', 3000);
            
            let processedCount = 0;
            let executor: PipelineExecutor | null = null;
            
            // Process files until no more are available
            while (true) {
                try {
                    // Create fresh executor for each iteration to ensure clean state
                    executor = new PipelineExecutor(this.app, this.settings);
                    const result = await executor.processNextFile();
                    
                    // Check if no more files are available
                    if (result.status === ProcessingStatus.SKIPPED) {
                        break;
                    }
                    
                    // Handle other results (completed, failed)
                    if (result.status === ProcessingStatus.COMPLETED) {
                        processedCount++;
                        logger.info(`File ${processedCount} processed: ${result.inputFile.name}`);
                    } else if (result.status === ProcessingStatus.FAILED) {
                        logger.warn(`File processing failed: ${result.error}`);
                        // Continue processing other files even if one fails
                    }
                    
                } catch (error) {
                    logger.error('Error during file processing iteration:', error);
                    // Continue processing other files even if one iteration fails
                }
            }
            
            // Show completion notification
            if (processedCount > 0) {
                new Notice(`✅ Successfully processed ${processedCount} file(s)`, 6000);
                logger.info(`Process All Files completed: ${processedCount} files processed`);
            } else {
                new Notice('ℹ️ No files found to process. Place audio files in inbox/audio/ folder.', 6000);
                logger.info('Process All Files completed: No files available');
            }
            
        } catch (error) {
            logger.error('Process All Files command failed:', error);
            
            // Show user-friendly error message
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            new Notice(`❌ Failed to process files: ${errorMessage}`, 8000);
            
            // Log detailed error information
            logger.error('Command execution error details:', {
                error: errorMessage,
                stack: error instanceof Error ? error.stack : undefined
            });
        }
    }

    /**
     * Handle processing results consistently across commands
     */
    private handleProcessingResult(result: any, contextDescription: string): void {
        switch (result.status) {
            case ProcessingStatus.COMPLETED:
                const outputCount = result.outputFiles.length;
                new Notice(
                    `✅ Successfully processed: ${result.inputFile.name} → ${outputCount} output file(s)`, 
                    6000
                );
                logger.info(`File processed successfully: ${result.inputFile.path}`, {
                    outputFiles: result.outputFiles,
                    stepId: result.stepId
                });
                break;
                
            case ProcessingStatus.SKIPPED:
                if (contextDescription.includes('next available')) {
                    new Notice('ℹ️ No files found to process. Place audio files in inbox/audio/ folder.', 6000);
                    logger.info('No files available for processing');
                } else {
                    new Notice(`ℹ️ File processing was skipped: ${contextDescription}`, 6000);
                    logger.info(`File processing skipped: ${contextDescription}`);
                }
                break;
                
            case ProcessingStatus.FAILED:
                new Notice(`❌ Processing failed: ${result.error || 'Unknown error'}`, 8000);
                logger.error('File processing failed:', {
                    error: result.error,
                    inputFile: result.inputFile?.path,
                    stepId: result.stepId
                });
                break;
                
            default:
                new Notice('⚠️ Processing completed with unknown status', 5000);
                logger.warn('Unexpected processing status:', result.status);
        }
    }

    /**
     * Find the appropriate processing step for a file using the unified discovery system
     */
    private async findStepForFile(file: TFile): Promise<string | null> {
        try {
            const pipelineConfig = getSafePipelineConfiguration(this.settings);
            if (!pipelineConfig) {
                return null;
            }

            const fileDiscovery = new FileDiscovery(this.app);
            return await fileDiscovery.findStepForFile(file, pipelineConfig);
        } catch (error) {
            logger.error('Error finding step for file:', error);
            return null;
        }
    }

    /**
     * Create a FileInfo object from a TFile
     */
    private async createFileInfo(file: TFile): Promise<any> {
        const stat = await this.app.vault.adapter.stat(file.path);
        
        return {
            name: file.name,
            path: file.path,
            size: stat?.size || 0,
            extension: file.extension ? `.${file.extension}` : '',
            isProcessable: true,
            lastModified: new Date(stat?.mtime || Date.now()),
            mimeType: undefined // Could be enhanced to detect MIME type
        };
    }
}