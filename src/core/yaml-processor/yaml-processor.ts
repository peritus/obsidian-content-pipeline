/**
 * YAML Frontmatter Processor - Main Orchestrator
 * 
 * Coordinates YAML request formatting and response parsing for LLM communication.
 */

import { App } from 'obsidian';
import { YamlFormatter } from './yaml-formatter';
import { YamlParser } from './yaml-parser';
import { 
    FileInfo, 
    ParsedYamlResponse,
    ProcessingContext,
    RoutingAwareOutput
} from '../../types';
import { createLogger } from '../../logger';

const logger = createLogger('YamlProcessor');

/**
 * YAML processing options
 */
export interface YamlProcessingOptions {
    /** Whether to validate YAML syntax strictly */
    strictValidation?: boolean;
    /** Maximum response size to process */
    maxResponseSize?: number;
}

/**
 * Main YAML processor for LLM communication
 */
export class YamlProcessor {
    private formatter: YamlFormatter;
    private parser: YamlParser;

    constructor(app: App) {
        this.formatter = new YamlFormatter(app);
        this.parser = new YamlParser();
        logger.debug('YamlProcessor initialized');
    }

    /**
     * Format a request with YAML frontmatter structure
     */
    async formatRequest(
        fileInfo: FileInfo,
        includeFiles: string[],
        context: ProcessingContext,
        routingAwareOutput?: RoutingAwareOutput,
        options: YamlProcessingOptions = {}
    ): Promise<string> {
        logger.debug(`Formatting YAML request for: ${fileInfo.path}`);
        return await this.formatter.formatRequest(fileInfo, includeFiles, context, routingAwareOutput, options);
    }

    /**
     * Parse LLM response with YAML frontmatter
     */
    parseResponse(
        response: string, 
        options: YamlProcessingOptions = {}
    ): ParsedYamlResponse {
        logger.debug(`Parsing YAML response: ${response.length} chars`);
        return this.parser.parseResponse(response, options);
    }

    /**
     * Validate YAML frontmatter syntax
     */
    validateYamlSyntax(text: string): boolean {
        return this.parser.validateSyntax(text);
    }

    /**
     * Get processing statistics
     */
    getStats() {
        return {
            formatter: this.formatter.getStats(),
            parser: this.parser.getStats()
        };
    }
}