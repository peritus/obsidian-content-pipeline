/**
 * YAML Request Formatter
 */

import { App } from 'obsidian';
import { FileOperations, FileUtils } from '../file-operations';
import { 
    FileInfo, 
    FileRole, 
    YamlRequestSection, 
    ProcessingContext 
} from '../../types';
import { YamlProcessingOptions } from './yaml-processor';
import { ErrorFactory } from '../../error-handler';
import { createLogger } from '../../logger';

const logger = createLogger('YamlFormatter');

interface FormatterStats {
    requestsFormatted: number;
    totalSections: number;
    averageSectionSize: number;
}

export class YamlFormatter {
    private fileOps: FileOperations;
    private stats: FormatterStats = {
        requestsFormatted: 0,
        totalSections: 0,
        averageSectionSize: 0
    };

    constructor(app: App) {
        this.fileOps = FileUtils.create(app);
        logger.debug('YamlFormatter initialized');
    }

    async formatRequest(
        fileInfo: FileInfo,
        includeFiles: string[],
        context: ProcessingContext,
        options: YamlProcessingOptions = {}
    ): Promise<string> {
        const { includeCategory = true } = options;

        try {
            const sections: YamlRequestSection[] = [];

            // Create input section
            const inputContent = await this.readFileContent(fileInfo.path);
            const inputSection: YamlRequestSection = {
                role: FileRole.INPUT,
                filename: fileInfo.name,
                category: includeCategory ? context.resolvedCategory : undefined,
                content: inputContent
            };
            sections.push(inputSection);

            // Process include files
            const includeSections = await this.processIncludeFiles(includeFiles);
            sections.push(...includeSections);

            // Format all sections
            const formattedRequest = this.formatSections(sections);
            
            // Update stats
            this.updateStats(sections);
            
            logger.debug(`Request formatted: ${sections.length} sections, ${formattedRequest.length} chars`);
            return formattedRequest;

        } catch (error) {
            throw ErrorFactory.parsing(
                `Failed to format YAML request: ${error instanceof Error ? error.message : String(error)}`,
                'Could not create request for LLM processing',
                { fileInfo, includeFiles, context, originalError: error },
                ['Check file accessibility', 'Verify include file paths']
            );
        }
    }

    private async readFileContent(filePath: string): Promise<string> {
        try {
            return await this.fileOps.readFile(filePath);
        } catch (error) {
            logger.warn(`Could not read file: ${filePath}`, error);
            return `[File not found: ${filePath}]`;
        }
    }

    private async processIncludeFiles(includeFiles: string[]): Promise<YamlRequestSection[]> {
        const sections: YamlRequestSection[] = [];

        for (const includePath of includeFiles) {
            try {
                const content = await this.readFileContent(includePath);
                const filename = includePath.split('/').pop() || includePath;
                const role = this.determineFileRole(includePath, includeFiles.length);
                
                sections.push({
                    role,
                    filename,
                    content
                });

            } catch (error) {
                logger.warn(`Failed to process include file: ${includePath}`, error);
            }
        }

        return sections;
    }

    private determineFileRole(filePath: string, totalFiles: number): FileRole {
        if (totalFiles === 1) {
            return FileRole.PROMPT;
        }

        if (filePath.toLowerCase().includes('prompt')) {
            return FileRole.PROMPT;
        }

        return FileRole.CONTEXT;
    }

    private formatSections(sections: YamlRequestSection[]): string {
        return sections.map(section => {
            const frontmatter = ['---'];
            frontmatter.push(`role: ${section.role}`);
            frontmatter.push(`filename: ${section.filename}`);
            if (section.category) {
                frontmatter.push(`category: ${section.category}`);
            }
            frontmatter.push('---');
            frontmatter.push('');
            frontmatter.push(section.content);
            return frontmatter.join('\n');
        }).join('\n\n');
    }

    private updateStats(sections: YamlRequestSection[]): void {
        this.stats.requestsFormatted++;
        this.stats.totalSections += sections.length;
        
        const totalSize = sections.reduce((sum, section) => sum + section.content.length, 0);
        this.stats.averageSectionSize = Math.round(totalSize / sections.length);
    }

    getStats(): FormatterStats {
        return { ...this.stats };
    }

    resetStats(): void {
        this.stats = {
            requestsFormatted: 0,
            totalSections: 0,
            averageSectionSize: 0
        };
    }
}