/**
 * YAML Response Parser
 */

import { 
    YamlResponseSection, 
    ParsedYamlResponse 
} from '../../types';
import { YamlProcessingOptions } from './yaml-processor';
import { ErrorFactory } from '../../error-handler';
import { createLogger } from '../../logger';

const logger = createLogger('YamlParser');

interface ParserStats {
    responsesParsed: number;
    multiFileResponses: number;
    totalSections: number;
    parseErrors: number;
}

export class YamlParser {
    private stats: ParserStats = {
        responsesParsed: 0,
        multiFileResponses: 0,
        totalSections: 0,
        parseErrors: 0
    };

    constructor() {
        logger.debug('YamlParser initialized');
    }

    parseResponse(response: string, options: YamlProcessingOptions = {}): ParsedYamlResponse {
        const { maxResponseSize = 1024 * 1024, strictValidation = false } = options;

        try {
            if (response.length > maxResponseSize) {
                throw ErrorFactory.parsing(
                    `Response too large: ${response.length} bytes`,
                    'LLM response exceeds maximum size limit',
                    { responseSize: response.length, maxSize: maxResponseSize },
                    ['Request smaller response from LLM', 'Increase size limit']
                );
            }

            const isMultiFile = this.detectMultiFileResponse(response);
            let sections: YamlResponseSection[];

            if (isMultiFile) {
                sections = this.parseMultiFileResponse(response, strictValidation);
                this.stats.multiFileResponses++;
            } else {
                const section = this.parseSingleFileResponse(response, strictValidation);
                sections = [section];
            }

            this.stats.responsesParsed++;
            this.stats.totalSections += sections.length;

            logger.debug(`Parsed ${isMultiFile ? 'multi' : 'single'}-file response: ${sections.length} files`);

            return {
                sections,
                isMultiFile,
                rawResponse: response
            };

        } catch (error) {
            this.stats.parseErrors++;
            throw ErrorFactory.parsing(
                `Failed to parse YAML response: ${error instanceof Error ? error.message : String(error)}`,
                'Could not understand LLM response format',
                { responseLength: response.length, originalError: error },
                ['Check LLM response format', 'Verify YAML frontmatter syntax']
            );
        }
    }

    validateSyntax(text: string): boolean {
        try {
            this.parseYamlSection(text, true);
            return true;
        } catch {
            return false;
        }
    }

    private detectMultiFileResponse(response: string): boolean {
        const lines = response.split('\n');
        let inFrontmatter = false;
        let frontmatterCount = 0;
        let foundContent = false;

        for (const line of lines) {
            if (line.trim() === '---') {
                if (inFrontmatter) {
                    inFrontmatter = false;
                    frontmatterCount++;
                } else {
                    if (foundContent && frontmatterCount > 0) {
                        return true;
                    }
                    inFrontmatter = true;
                    foundContent = false;
                }
            } else if (!inFrontmatter && line.trim().length > 0) {
                foundContent = true;
            }
        }

        return false;
    }

    private parseSingleFileResponse(response: string, strict: boolean): YamlResponseSection {
        const trimmed = response.trim();
        
        if (trimmed.startsWith('---')) {
            return this.parseYamlSection(trimmed, strict);
        } else {
            return {
                filename: 'response.md',
                content: trimmed
            };
        }
    }

    private parseMultiFileResponse(response: string, strict: boolean): YamlResponseSection[] {
        const sections: YamlResponseSection[] = [];
        const lines = response.split('\n');
        
        let currentSection: string[] = [];
        let inFrontmatter = false;
        let frontmatterCount = 0;
        let foundContent = false;
        let sectionIndex = 1;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            if (line.trim() === '---') {
                if (inFrontmatter) {
                    inFrontmatter = false;
                    frontmatterCount++;
                    currentSection.push(line);
                } else {
                    if (foundContent && frontmatterCount > 0) {
                        try {
                            const sectionText = currentSection.join('\n').trim();
                            if (sectionText) {
                                const section = this.parseYamlSection(sectionText, strict);
                                sections.push(section);
                            }
                        } catch (error) {
                            if (strict) {
                                throw error;
                            }
                            sections.push({
                                filename: `section-${sectionIndex}.md`,
                                content: currentSection.join('\n').trim()
                            });
                        }
                        currentSection = [];
                        foundContent = false;
                        sectionIndex++;
                    }
                    inFrontmatter = true;
                    currentSection.push(line);
                }
            } else {
                currentSection.push(line);
                if (!inFrontmatter && line.trim().length > 0) {
                    foundContent = true;
                }
            }
        }

        if (currentSection.length > 0) {
            try {
                const sectionText = currentSection.join('\n').trim();
                if (sectionText) {
                    const section = this.parseYamlSection(sectionText, strict);
                    sections.push(section);
                }
            } catch (error) {
                if (strict) {
                    throw error;
                }
                sections.push({
                    filename: `section-${sectionIndex}.md`,
                    content: currentSection.join('\n').trim()
                });
            }
        }

        return sections;
    }

    private parseYamlSection(text: string, strict: boolean): YamlResponseSection {
        if (!text.startsWith('---')) {
            if (strict) {
                throw ErrorFactory.parsing(
                    'Section does not start with YAML frontmatter',
                    'Invalid YAML format in response',
                    { text: text.substring(0, 100) + '...' }
                );
            }
            return {
                filename: 'untitled.md',
                content: text
            };
        }

        const lines = text.split('\n');
        let frontmatterEnd = -1;

        for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim() === '---') {
                frontmatterEnd = i;
                break;
            }
        }

        if (frontmatterEnd === -1) {
            // Check if we have malformed YAML - if strict mode, throw immediately
            if (strict) {
                throw ErrorFactory.parsing(
                    'No closing --- found for YAML frontmatter',
                    'Incomplete YAML frontmatter in response'
                );
            }
            // In non-strict mode, treat as plain content
            return {
                filename: 'untitled.md',
                content: text
            };
        }

        const frontmatterLines = lines.slice(1, frontmatterEnd);
        const content = lines.slice(frontmatterEnd + 1).join('\n').trim();

        const section: YamlResponseSection = {
            filename: 'untitled.md',
            content
        };

        // Parse frontmatter lines - in strict mode, be more careful about malformed YAML
        for (const line of frontmatterLines) {
            const trimmedLine = line.trim();
            if (trimmedLine.includes(':')) {
                const colonIndex = trimmedLine.indexOf(':');
                const key = trimmedLine.substring(0, colonIndex).trim();
                const value = trimmedLine.substring(colonIndex + 1).trim();
                
                if (key === 'filename') {
                    section.filename = value;
                } else if (key === 'category') {
                    section.category = value;
                }
            } else if (trimmedLine.length > 0 && strict) {
                // In strict mode, frontmatter lines should have colons
                throw ErrorFactory.parsing(
                    'Malformed YAML frontmatter line: ' + trimmedLine,
                    'Invalid YAML format in response'
                );
            }
        }

        return section;
    }

    getStats(): ParserStats {
        return { ...this.stats };
    }

    resetStats(): void {
        this.stats = {
            responsesParsed: 0,
            multiFileResponses: 0,
            totalSections: 0,
            parseErrors: 0
        };
    }
}