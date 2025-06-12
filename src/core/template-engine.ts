/**
 * Template Engine for Processing Output Files
 */

import { App } from 'obsidian';
import { FileOperations } from './file-operations';
import { 
    TemplateFile, 
    TemplateVariables, 
    TemplateResult, 
    TemplateMetadata 
} from '../types';
import { ErrorFactory } from '../error-handler';
import { createLogger } from '../logger';

const logger = createLogger('TemplateEngine');

export class TemplateEngine {
    private app: App;
    private fileOps: FileOperations;
    private templateCache: Map<string, TemplateFile> = new Map();

    constructor(app: App) {
        this.app = app;
        this.fileOps = new FileOperations(app);
        logger.debug('TemplateEngine initialized');
    }

    /**
     * Process a template with given variables and content
     */
    async processTemplate(
        templatePath: string,
        variables: TemplateVariables,
        content: string
    ): Promise<TemplateResult> {
        try {
            logger.debug(`Processing template: ${templatePath}`);

            // Load template (with caching)
            const template = await this.loadTemplate(templatePath);
            
            // Validate template variables
            this.validateTemplateVariables(template, variables);
            
            // Perform variable substitution
            const processedContent = this.substituteVariables(
                template.content, 
                variables, 
                content
            );

            logger.debug(`Template processed successfully: ${templatePath}`);
            
            return {
                content: processedContent,
                variables: variables,
                templatePath: templatePath,
                processedAt: new Date().toISOString()
            };

        } catch (error) {
            logger.error(`Template processing failed: ${templatePath}`, error);
            throw ErrorFactory.template(
                `Template processing failed: ${error instanceof Error ? error.message : String(error)}`,
                `Failed to process template at ${templatePath}`,
                { templatePath, variables },
                ['Check template file exists', 'Verify template syntax', 'Check variable names']
            );
        }
    }

    /**
     * Load and parse template file
     */
    private async loadTemplate(templatePath: string): Promise<TemplateFile> {
        // Check cache first
        if (this.templateCache.has(templatePath)) {
            return this.templateCache.get(templatePath)!;
        }

        try {
            // Read template file
            const templateContent = await this.fileOps.readFile(templatePath);
            
            // Parse frontmatter and content
            const { frontmatter, content } = this.parseTemplate(templateContent);
            
            const template: TemplateFile = {
                frontmatter,
                content,
                filePath: templatePath
            };

            // Cache the template
            this.templateCache.set(templatePath, template);
            
            logger.debug(`Template loaded and cached: ${templatePath}`);
            return template;

        } catch (error) {
            throw ErrorFactory.template(
                `Failed to load template: ${error instanceof Error ? error.message : String(error)}`,
                `Template file could not be loaded from ${templatePath}`,
                { templatePath },
                ['Check template file exists', 'Verify file permissions', 'Check file format']
            );
        }
    }

    /**
     * Parse template file into frontmatter and content
     */
    private parseTemplate(content: string): { frontmatter: TemplateMetadata; content: string } {
        const lines = content.split('\n');
        
        // Check for frontmatter
        if (lines[0] !== '---') {
            // No frontmatter, treat entire content as template
            return {
                frontmatter: {
                    variables: [],
                    description: 'Template without frontmatter',
                    step: 'unknown'
                },
                content: content
            };
        }

        // Find end of frontmatter
        let frontmatterEnd = -1;
        for (let i = 1; i < lines.length; i++) {
            if (lines[i] === '---') {
                frontmatterEnd = i;
                break;
            }
        }

        if (frontmatterEnd === -1) {
            throw new Error('Invalid frontmatter: missing closing ---');
        }

        // Parse YAML frontmatter
        const frontmatterLines = lines.slice(1, frontmatterEnd);
        const frontmatter = this.parseYamlFrontmatter(frontmatterLines);
        
        // Extract content after frontmatter
        const templateContent = lines.slice(frontmatterEnd + 1).join('\n');

        return { frontmatter, content: templateContent };
    }

    /**
     * Simple YAML frontmatter parser for template metadata
     */
    private parseYamlFrontmatter(lines: string[]): TemplateMetadata {
        const metadata: Partial<TemplateMetadata> = {};

        for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine || trimmedLine.startsWith('#')) continue;

            const colonIndex = trimmedLine.indexOf(':');
            if (colonIndex === -1) continue;

            const key = trimmedLine.substring(0, colonIndex).trim();
            const value = trimmedLine.substring(colonIndex + 1).trim();

            switch (key) {
                case 'variables':
                    // Parse array: variables: [var1, var2, var3]
                    metadata.variables = this.parseArrayValue(value);
                    break;
                case 'description':
                    metadata.description = this.parseStringValue(value);
                    break;
                case 'step':
                    metadata.step = this.parseStringValue(value);
                    break;
                case 'version':
                    metadata.version = this.parseStringValue(value);
                    break;
            }
        }

        return {
            variables: metadata.variables || [],
            description: metadata.description || 'No description',
            step: metadata.step || 'unknown',
            version: metadata.version
        };
    }

    /**
     * Parse array value from YAML
     */
    private parseArrayValue(value: string): string[] {
        // Handle [item1, item2, item3] format
        if (value.startsWith('[') && value.endsWith(']')) {
            const content = value.slice(1, -1);
            return content.split(',').map(item => item.trim().replace(/['"]/g, ''));
        }
        return [];
    }

    /**
     * Parse string value from YAML
     */
    private parseStringValue(value: string): string {
        // Remove quotes if present
        return value.replace(/^["']|["']$/g, '');
    }

    /**
     * Validate that required template variables are provided
     */
    private validateTemplateVariables(template: TemplateFile, variables: TemplateVariables): void {
        const requiredVars = template.frontmatter.variables;
        const providedVars = Object.keys(variables);

        const missingVars = requiredVars.filter(varName => !providedVars.includes(varName));
        
        if (missingVars.length > 0) {
            throw new Error(`Missing required template variables: ${missingVars.join(', ')}`);
        }
    }

    /**
     * Substitute variables in template content
     */
    private substituteVariables(
        templateContent: string, 
        variables: TemplateVariables, 
        content: string
    ): string {
        let result = templateContent;

        // Add content as a special variable
        const allVariables = { ...variables, content };

        // Replace all {variableName} patterns
        for (const [key, value] of Object.entries(allVariables)) {
            const pattern = new RegExp(`\\{${key}\\}`, 'g');
            result = result.replace(pattern, String(value));
        }

        return result;
    }

    /**
     * Clear template cache (useful for development/testing)
     */
    clearCache(): void {
        this.templateCache.clear();
        logger.debug('Template cache cleared');
    }

    /**
     * Get cached template count (for debugging)
     */
    getCacheSize(): number {
        return this.templateCache.size;
    }
}
