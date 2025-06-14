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
    routedResponses: number;
    sectionsWithRouting: number;
}

export class YamlParser {
    private stats: ParserStats = {
        responsesParsed: 0,
        multiFileResponses: 0,
        totalSections: 0,
        parseErrors: 0,
        routedResponses: 0,
        sectionsWithRouting: 0
    };

    constructor() {
        logger.debug('YamlParser initialized');
    }

    parseResponse(response: string, options: YamlProcessingOptions = {}): ParsedYamlResponse {
        const { maxResponseSize = 1024 * 1024, strictValidation = false } = options;

        try {
            // Debug logging: Parsing YAML response
            logger.debug("Parsing YAML response", {
                responseLength: response.length,
                rawResponse: response.substring(0, 500) + (response.length > 500 ? "..." : "") // First 500 chars
            });

            if (response.length > maxResponseSize) {
                throw ErrorFactory.parsing(
                    `Response too large: ${response.length} bytes`,
                    'LLM response exceeds maximum size limit',
                    { responseSize: response.length, maxSize: maxResponseSize },
                    ['Request smaller response from LLM', 'Increase size limit']
                );
            }

            const isMultiFile = this.detectMultiFileResponse(response);
            
            // Debug logging: Split sections analysis
            const sections = response.split('---');
            logger.debug("Split sections", {
                sectionCount: sections.length,
                sectionLengths: sections.map(s => s.length),
                firstSection: sections[0] || '',
                secondSection: sections[1] || '',
                thirdSection: sections[2] ? sections[2].substring(0, 100) + (sections[2].length > 100 ? "..." : "") : undefined // First 100 chars of content
            });

            let parsedSections: YamlResponseSection[];

            if (isMultiFile) {
                parsedSections = this.parseMultiFileResponse(response, strictValidation);
                this.stats.multiFileResponses++;
            } else {
                const section = this.parseSingleFileResponse(response, strictValidation);
                parsedSections = [section];
            }

            // Debug logging: For each parsed file
            parsedSections.forEach((parsedFile, index) => {
                logger.debug(`Parsed file ${index + 1}`, {
                    frontmatter: {
                        filename: parsedFile.filename,
                        nextStep: parsedFile.nextStep
                    },
                    contentLength: parsedFile.content?.length || 0,
                    contentPreview: parsedFile.content ? parsedFile.content.substring(0, 100) + (parsedFile.content.length > 100 ? "..." : "") : undefined
                });
            });

            // Track routing statistics
            let sectionsWithRouting = 0;
            parsedSections.forEach(section => {
                if (section.nextStep && section.nextStep.trim() !== '') {
                    sectionsWithRouting++;
                }
            });

            if (sectionsWithRouting > 0) {
                this.stats.routedResponses++;
            }
            this.stats.sectionsWithRouting += sectionsWithRouting;

            this.stats.responsesParsed++;
            this.stats.totalSections += parsedSections.length;

            logger.debug(`Parsed ${isMultiFile ? 'multi' : 'single'}-file response: ${parsedSections.length} files`);

            return {
                sections: parsedSections,
                isMultiFile,
                rawResponse: response
            };

        } catch (error) {
            this.stats.parseErrors++;
            
            // Debug logging: Parse error details
            logger.debug("YAML parsing error details", {
                error: error instanceof Error ? error.message : String(error),
                responseLength: response.length,
                responseStart: response.substring(0, 200) + (response.length > 200 ? "..." : ""),
                splitAttempt: response.split('---').map((section, index) => ({
                    index,
                    length: section.length,
                    preview: section.substring(0, 50) + (section.length > 50 ? "..." : "")
                }))
            });
            
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
                            // Use correct section index for fallback filename
                            sections.push({
                                filename: `section-${sections.length + 1}.md`,
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

        // Handle final section
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
                // Use correct section index for fallback filename
                sections.push({
                    filename: `section-${sections.length + 1}.md`,
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
            // Always throw the specific error message for incomplete frontmatter
            throw ErrorFactory.parsing(
                'No closing --- found for YAML frontmatter',
                'Incomplete YAML frontmatter in response'
            );
        }

        const frontmatterLines = lines.slice(1, frontmatterEnd);
        const content = lines.slice(frontmatterEnd + 1).join('\n').trim();

        const section: YamlResponseSection = {
            filename: 'untitled.md',
            content
        };

        // Parse frontmatter lines - be more strict about malformed YAML
        for (const line of frontmatterLines) {
            const trimmedLine = line.trim();
            if (trimmedLine.length === 0) {
                continue; // Skip empty lines
            }
            
            if (trimmedLine.includes(':')) {
                // In strict mode, check for malformed YAML patterns
                if (strict) {
                    // Check for multiple unescaped colons which can be ambiguous
                    const colonCount = (trimmedLine.match(/:/g) || []).length;
                    if (colonCount > 1) {
                        // Check if this looks like malformed YAML (multiple colons without proper structure)
                        const colonIndex = trimmedLine.indexOf(':');
                        const key = trimmedLine.substring(0, colonIndex).trim();
                        const value = trimmedLine.substring(colonIndex + 1).trim();
                        
                        // If the value contains unescaped/unquoted colons, it's potentially malformed
                        if (value.includes(':') && !value.startsWith('"') && !value.startsWith("'")) {
                            throw ErrorFactory.parsing(
                                'Malformed YAML frontmatter: multiple unescaped colons',
                                'Invalid YAML format in response'
                            );
                        }
                    }
                }
                
                const colonIndex = trimmedLine.indexOf(':');
                const key = trimmedLine.substring(0, colonIndex).trim();
                const value = trimmedLine.substring(colonIndex + 1).trim();
                
                if (key === 'filename') {
                    section.filename = value;
                } else if (key === 'nextStep') {
                    section.nextStep = value;
                }
            } else {
                // Any non-empty line without a colon is malformed YAML
                if (strict) {
                    throw ErrorFactory.parsing(
                        'Malformed YAML frontmatter line: ' + trimmedLine,
                        'Invalid YAML format in response'
                    );
                }
                // In non-strict mode, we still throw for clearly malformed YAML
                // Check if this looks like malformed YAML (has text but no proper key-value structure)
                if (trimmedLine.length > 0 && !trimmedLine.startsWith('#')) {
                    throw ErrorFactory.parsing(
                        'Malformed YAML frontmatter',
                        'Invalid YAML format in response'
                    );
                }
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
            parseErrors: 0,
            routedResponses: 0,
            sectionsWithRouting: 0
        };
    }
}