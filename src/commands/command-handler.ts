/**
 * Command handlers for Audio Inbox plugin
 * 
 * Centralizes all command logic and processing operations.
 */

import { App, Notice, TFile } from 'obsidian';
import { AudioInboxSettings, ProcessingStatus } from '../types';
import { PipelineExecutor } from '../core/pipeline-executor';
import { FileDiscovery } from '../core/file-operations';
import { createConfigurationService } from '../core/configuration-service';
import { createLogger } from '../logger';

const logger = createLogger('CommandHandler');

export class CommandHandler {
    private app: App;
    private settings: AudioInboxSettings;

    constructor(app: App, settings: AudioInboxSettings) {
        this.app = app;
        this.settings = settings;
    }

    /**
     * Check if a specific file can be processed using the existing discovery system (synchronous)
     * This is used for file menu integration where we need immediate results
     */
    canFileBeProcessedSync(file: TFile): boolean {
        try {
            // Check configuration validity using centralized configuration service
            const configService = createConfigurationService(this.settings);
            const validationResult = configService.validateConfigurations();
            if (!validationResult.isValid) {
                return false;
            }

            const pipelineConfig = configService.getSafePipelineConfiguration();
            if (!pipelineConfig) {
                return false;
            }

            // Use the unified FileDiscovery system (synchronous version)
            const fileDiscovery = new FileDiscovery(this.app);
            return fileDiscovery.canFileBeProcessedSync(file, pipelineConfig);

        } catch (error) {
            logger.warn('Error checking if file can be processed (sync):', error);
            return false;
        }
    }

    /**
     * Check if a specific file can be processed using the existing discovery system (async)
     */
    async canFileBeProcessed(file: TFile): Promise<boolean> {
        try {
            // Check configuration validity using centralized configuration service
            const configService = createConfigurationService(this.settings);
            const validationResult = configService.validateConfigurations();
            if (!validationResult.isValid) {
                return false;
            }

            const pipelineConfig = configService.getSafePipelineConfiguration();
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
            
            // Check if both configurations are available and valid using centralized configuration service
            const configService = createConfigurationService(this.settings);
            const validationResult = configService.validateConfigurations();
            if (!validationResult.isValid) {
                this.showNotice(`❌ Configuration invalid: ${validationResult.error}. Please check settings.`, 8000);
                logger.error('Configuration validation failed:', validationResult.error);
                return;
            }

            // Intelligent Processing: Find the appropriate step for this file
            const stepId = await this.findStepForFile(file);
            if (!stepId) {
                this.showNotice(`❌ Could not determine processing step for file: ${file.name}`, 8000);
                logger.error(`No step found for file: ${file.path}`);
                return;
            }

            // Show processing started notification
            this.showNotice(`🔄 Processing file: ${file.name}...`, 3000);
            
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
            this.showNotice(`❌ Failed to process file: ${errorMessage}`, 8000);
            
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
            
            // Check if both configurations are available and valid using centralized configuration service
            const configService = createConfigurationService(this.settings);
            const validationResult = configService.validateConfigurations();
            if (!validationResult.isValid) {
                this.showNotice(`❌ Configuration invalid: ${validationResult.error}. Please check settings.`, 8000);
                logger.error('Configuration validation failed:', validationResult.error);
                return;
            }

            // Show processing started notification
            this.showNotice('🔄 Processing next file...', 3000);
            
            // Create executor and process file
            const executor = new PipelineExecutor(this.app, this.settings);
            const result = await executor.processNextFile();
            
            // Handle result based on status
            this.handleProcessingResult(result, 'next available file');
            
        } catch (error) {
            logger.error('Process Next File command failed:', error);
            
            // Show user-friendly error message
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            this.showNotice(`❌ Failed to process file: ${errorMessage}`, 8000);
            
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
                this.showNotice(
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
                    this.showNotice('ℹ️ No files found to process. Place audio files in inbox/audio/ folder.', 6000);
                    logger.info('No files available for processing');
                } else {
                    this.showNotice(`ℹ️ File processing was skipped: ${contextDescription}`, 6000);
                    logger.info(`File processing skipped: ${contextDescription}`);
                }
                break;
                
            case ProcessingStatus.FAILED:
                this.showNotice(`❌ Processing failed: ${result.error || 'Unknown error'}`, 8000);
                logger.error('File processing failed:', {
                    error: result.error,
                    inputFile: result.inputFile?.path,
                    stepId: result.stepId
                });
                break;
                
            default:
                this.showNotice('⚠️ Processing completed with unknown status', 5000);
                logger.warn('Unexpected processing status:', result.status);
        }
    }

    /**
     * Find the appropriate processing step for a file using the unified discovery system
     */
    private async findStepForFile(file: TFile): Promise<string | null> {
        try {
            const configService = createConfigurationService(this.settings);
            const pipelineConfig = configService.getSafePipelineConfiguration();
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

    /**
     * Show a notice to the user
     */
    private showNotice(message: string, timeout: number = 5000): void {
        new Notice(message, timeout);
    }
}