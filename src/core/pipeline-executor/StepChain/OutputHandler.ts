/**
 * Output File Handling Logic
 */

import { App } from 'obsidian';
import { FileOperations, FileUtils } from '../../file-operations';
import { PathResolver, PathUtils } from '../../path-resolver';
import { TemplateEngine } from '../../template-engine';
import { 
    PipelineStep,
    ProcessingContext,
    TemplateVariables
} from '../../../types';
import { createLogger } from '../../../logger';

const logger = createLogger('OutputHandler');

export class OutputHandler {
    private app: App;
    private fileOps: FileOperations;
    private templateEngine: TemplateEngine;

    constructor(app: App) {
        this.app = app;
        this.fileOps = new FileOperations(app);
        this.templateEngine = new TemplateEngine(app);
    }

    async save(
        section: any,
        step: PipelineStep,
        context: ProcessingContext
    ): Promise<string> {
        // Resolve output path with filename from section
        const pathContext = FileUtils.createProcessingContext({
            ...context,
            filename: PathUtils.getBasename(section.filename || 'output')
        } as any, context.stepId);

        const outputResult = PathResolver.resolvePath(step.output, pathContext);
        const outputPath = outputResult.resolvedPath;

        try {
            // Create template variables from context and section
            const templateVariables: TemplateVariables = {
                category: section.category || context.resolvedCategory,
                content: section.content,
                filename: section.filename || PathUtils.getBasename(outputPath),
                timestamp: context.timestamp,
                date: context.date,
                archivePath: context.archivePath,
                inputPath: context.inputPath,
                outputPath: outputPath,
                stepId: context.stepId,
                originalCategory: context.originalCategory,
                resolvedCategory: context.resolvedCategory
            };

            // Process template with variables and content
            const templateResult = await this.templateEngine.processTemplate(
                step.template,
                templateVariables,
                section.content
            );

            // Write processed content to file
            await this.fileOps.writeFile(outputPath, templateResult.content, {
                createDirectories: true,
                overwrite: true
            });

            logger.debug(`Output file saved with template: ${outputPath}`);
            return outputPath;

        } catch (error) {
            logger.warn(`Template processing failed for ${outputPath}, using fallback`, error);
            
            // Fallback to simple content creation if template fails
            const content = `---
source: "${context.archivePath}"
processed: "${context.timestamp}"
step: "${context.stepId}"
category: "${section.category || context.resolvedCategory}"
filename: "${section.filename || 'output.md'}"
---

${section.content}`;

            await this.fileOps.writeFile(outputPath, content, {
                createDirectories: true,
                overwrite: true
            });

            logger.debug(`Output file saved with fallback: ${outputPath}`);
            return outputPath;
        }
    }
}
