/**
 * YAML Request Formatter
 */

import { App } from 'obsidian';
import { FileOperations, FileUtils } from '../file-operations';
import { 
    FileInfo, 
    FileRole, 
    YamlRequestSection, 
    ProcessingContext,
    StepRoutingInfo,
    RoutingAwareOutput,
    isRoutingAwareOutput
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
        routingAwareOutput?: RoutingAwareOutput,
        options: YamlProcessingOptions = {}
    ): Promise<string> {
        try {
            const sections: YamlRequestSection[] = [];

            // Create input section - strip frontmatter to prevent doubling
            const rawInputContent = await this.readFileContent(fileInfo.path);
            const inputContent = FileUtils.stripFrontmatter(rawInputContent);
            const inputSection: YamlRequestSection = {
                role: FileRole.INPUT,
                filename: fileInfo.name,
                content: inputContent
            };
            sections.push(inputSection);

            // Process include files
            const includeSections = await this.processIncludeFiles(includeFiles);
            sections.push(...includeSections);

            // Add routing section if routing-aware output is available
            if (routingAwareOutput && isRoutingAwareOutput(routingAwareOutput)) {
                const routingSteps = Object.keys(routingAwareOutput).filter(key => key !== 'default');
                if (routingSteps.length > 0) {
                    // Convert routing-aware output to the expected format for routing info
                    const nextSteps: { [stepId: string]: string } = {};
                    routingSteps.forEach(stepId => {
                        nextSteps[stepId] = `Route to ${stepId} processing`;
                    });

                    const routingSection: YamlRequestSection = {
                        role: FileRole.ROUTING,
                        filename: 'routing-info',
                        content: this.formatRoutingInfo({ available_next_steps: nextSteps })
                    };
                    sections.push(routingSection);
                }
            }

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

    private formatRoutingInfo(routingInfo: StepRoutingInfo): string {
        const lines = [
            'You can return single or multiple files using YAML frontmatter format:',
            '',
            'For single file:',
            '---',
            'filename: Call John about Budget Meeting.md',
            'nextStep: chosen_step_id',
            '---',
            'Your content here...',
            '',
            'For multiple files:',
            '---',
            'filename: Buy 3x Tomatoes at Supermarket.md',
            'nextStep: step_id_1',
            '---',
            'First document content...',
            '',
            '---',
            'filename: Fix Kitchen Sink This Weekend.md',
            'nextStep: step_id_2',
            '---',
            'Second document content...',
            '',
            'Choose SPECIFIC filenames based on the actual content, not generic categories.',
            'Use the main action or key details from the content:',
            '- "Kaufe 5x Nudeln im Supermarkt.md" NOT "Einkaufsliste.md"',
            '- "Call Maria about Project Deadline.md" NOT "Phone Calls.md"',
            '- "Fix Leaky Bathroom Faucet.md" NOT "Home Repairs.md"',
            '- "Book Flight to Berlin for Conference.md" NOT "Travel Planning.md"',
            '',
            'Use the \'nextStep\' field to route content to the most appropriate next processing step based on the available options provided.',
            '',
            'Available next steps:'
        ];
        
        for (const [stepId, description] of Object.entries(routingInfo.available_next_steps)) {
            lines.push(`- ${stepId}: ${description}`);
        }
        
        return lines.join('\n');
    }

    private formatSections(sections: YamlRequestSection[]): string {
        return sections.map(section => {
            const frontmatter = ['---'];
            frontmatter.push(`role: ${section.role}`);
            frontmatter.push(`filename: ${section.filename}`);
            
            // Add routing-specific frontmatter for routing sections
            if (section.role === FileRole.ROUTING) {
                const routingContent = section.content;
                const lines = routingContent.split('\n');
                
                // Find the "Available next steps:" line and extract steps
                const availableStepsIndex = lines.findIndex(line => line.trim() === 'Available next steps:');
                if (availableStepsIndex !== -1) {
                    const availableSteps: { [stepId: string]: string } = {};
                    for (let i = availableStepsIndex + 1; i < lines.length; i++) {
                        const line = lines[i].trim();
                        if (line.startsWith('- ')) {
                            const match = line.match(/^- ([^:]+): (.+)$/);
                            if (match) {
                                availableSteps[match[1]] = match[2];
                            }
                        }
                    }
                    frontmatter.push(`available_next_steps:`);
                    for (const [stepId, description] of Object.entries(availableSteps)) {
                        frontmatter.push(`  ${stepId}: "${description}"`);
                    }
                }
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