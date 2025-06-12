/**
 * YAML Processor Tests
 * 
 * Test suite for the YAML frontmatter processing system.
 */

import { YamlProcessor, YamlFormatter, YamlParser } from '../src/core/yaml-processor';
import { FileInfo, FileRole, ProcessingContext } from '../src/types';
import { App } from 'obsidian';
import { cleanup } from './setup';

// Mock app for testing
const mockApp = {} as App;

// Mock file info
const mockFileInfo: FileInfo = {
    name: 'test-audio.mp3',
    path: 'inbox/audio/tasks/test-audio.mp3',
    size: 1024,
    extension: '.mp3',
    category: 'tasks',
    isProcessable: true,
    lastModified: new Date(),
    mimeType: 'audio/mpeg'
};

// Mock processing context
const mockContext: ProcessingContext = {
    originalCategory: 'tasks',
    resolvedCategory: 'tasks',
    filename: 'test-audio',
    timestamp: '2024-01-15T10:30:00Z',
    date: '2024-01-15',
    archivePath: 'inbox/archive/transcribe/tasks/test-audio.mp3',
    stepId: 'transcribe',
    inputPath: 'inbox/audio/tasks/test-audio.mp3',
    outputPath: 'inbox/transcripts/tasks/test-audio-transcript.md'
};

describe('YAML Processor Integration', () => {
    let processor: YamlProcessor;

    beforeEach(() => {
        processor = new YamlProcessor(mockApp);
    });

    afterEach(() => {
        cleanup();
    });

    describe('Initialization', () => {
        it('should initialize correctly', () => {
            expect(processor).toBeDefined();
            expect(typeof processor.formatRequest).toBe('function');
            expect(typeof processor.parseResponse).toBe('function');
            expect(typeof processor.validateYamlSyntax).toBe('function');
        });
    });

    describe('Request/Response Flow', () => {
        it('should format and parse a complete request-response cycle', async () => {
            // Format a request
            const includeFiles = ['transcriptionprompt.md'];
            const request = await processor.formatRequest(
                mockFileInfo,
                includeFiles,
                mockContext
            );

            expect(request).toContain('---');
            expect(request).toContain('role: input');
            expect(request).toContain('filename: test-audio.mp3');
            expect(request).toContain('category: tasks');

            // Parse a mock response
            const mockResponse = `---
filename: transcript.md
category: tasks
---

# Transcript

This is a test transcription.`;

            const parsed = processor.parseResponse(mockResponse);
            expect(parsed.isMultiFile).toBe(false);
            expect(parsed.sections).toHaveLength(1);
            expect(parsed.sections[0].filename).toBe('transcript.md');
            expect(parsed.sections[0].category).toBe('tasks');
            expect(parsed.sections[0].content).toContain('This is a test transcription');
        });
    });
});

describe('YAML Formatter', () => {
    let formatter: YamlFormatter;

    beforeEach(() => {
        formatter = new YamlFormatter(mockApp);
    });

    afterEach(() => {
        cleanup();
    });

    describe('Request Formatting', () => {
        it('should format basic request with input section', async () => {
            const request = await formatter.formatRequest(
                mockFileInfo,
                [],
                mockContext,
                { includeCategory: true }
            );

            expect(request).toContain('---');
            expect(request).toContain('role: input');
            expect(request).toContain('filename: test-audio.mp3');
            expect(request).toContain('category: tasks');
            expect(request).toContain('[File not found: inbox/audio/tasks/test-audio.mp3]');
        });

        it('should handle include files', async () => {
            const includeFiles = ['prompt.md', 'context.md'];
            const request = await formatter.formatRequest(
                mockFileInfo,
                includeFiles,
                mockContext
            );

            // Should have 3 sections: input + 2 includes
            const sections = request.split('---').filter(s => s.trim().length > 0);
            expect(sections.length).toBeGreaterThanOrEqual(3);
        });

        it('should determine file roles correctly', async () => {
            const includeFiles = ['transcriptionprompt.md'];
            const request = await formatter.formatRequest(
                mockFileInfo,
                includeFiles,
                mockContext
            );

            expect(request).toContain('role: input');
            expect(request).toContain('role: prompt');
        });

        it('should handle missing category option', async () => {
            const request = await formatter.formatRequest(
                mockFileInfo,
                [],
                mockContext,
                { includeCategory: false }
            );

            expect(request).toContain('role: input');
            expect(request).not.toContain('category:');
        });
    });

    describe('Statistics', () => {
        it('should track formatting statistics', async () => {
            const initialStats = formatter.getStats();
            expect(initialStats.requestsFormatted).toBe(0);

            await formatter.formatRequest(mockFileInfo, [], mockContext);
            
            const updatedStats = formatter.getStats();
            expect(updatedStats.requestsFormatted).toBe(1);
            expect(updatedStats.totalSections).toBeGreaterThan(0);
        });

        it('should reset statistics', async () => {
            await formatter.formatRequest(mockFileInfo, [], mockContext);
            
            formatter.resetStats();
            const stats = formatter.getStats();
            expect(stats.requestsFormatted).toBe(0);
            expect(stats.totalSections).toBe(0);
        });
    });
});

describe('YAML Parser', () => {
    let parser: YamlParser;

    beforeEach(() => {
        parser = new YamlParser();
    });

    afterEach(() => {
        cleanup();
    });

    describe('Single File Responses', () => {
        it('should parse single file with YAML frontmatter', () => {
            const response = `---
filename: output.md
category: tasks
---

# Test Output

This is the generated content.`;

            const parsed = parser.parseResponse(response);
            
            expect(parsed.isMultiFile).toBe(false);
            expect(parsed.sections).toHaveLength(1);
            expect(parsed.sections[0].filename).toBe('output.md');
            expect(parsed.sections[0].category).toBe('tasks');
            expect(parsed.sections[0].content).toContain('This is the generated content');
        });

        it('should parse plain text response without frontmatter', () => {
            const response = 'This is just plain text content.';
            
            const parsed = parser.parseResponse(response);
            
            expect(parsed.isMultiFile).toBe(false);
            expect(parsed.sections).toHaveLength(1);
            expect(parsed.sections[0].filename).toBe('response.md');
            expect(parsed.sections[0].content).toBe(response);
        });

        it('should handle missing filename in frontmatter', () => {
            const response = `---
category: tasks
---

Content without filename.`;

            const parsed = parser.parseResponse(response);
            
            expect(parsed.sections[0].filename).toBe('untitled.md');
            expect(parsed.sections[0].category).toBe('tasks');
        });
    });

    describe('Multi-File Responses', () => {
        it('should parse multi-file response correctly', () => {
            const response = `---
filename: file1.md
category: tasks
---

First file content.

---
filename: file2.md
category: thoughts
---

Second file content.`;

            const parsed = parser.parseResponse(response);
            
            expect(parsed.isMultiFile).toBe(true);
            expect(parsed.sections).toHaveLength(2);
            expect(parsed.sections[0].filename).toBe('file1.md');
            expect(parsed.sections[0].category).toBe('tasks');
            expect(parsed.sections[1].filename).toBe('file2.md');
            expect(parsed.sections[1].category).toBe('thoughts');
        });

        it('should handle malformed sections in non-strict mode', () => {
            const response = `---
filename: good.md
---

Good content.

---
malformed frontmatter
---

Bad content.`;

            const parsed = parser.parseResponse(response, { strictValidation: false });
            
            expect(parsed.sections).toHaveLength(2);
            expect(parsed.sections[0].filename).toBe('good.md');
            expect(parsed.sections[1].filename).toBe('section-2.md'); // Fallback name
        });
    });

    describe('Error Handling', () => {
        it('should handle response size limits', () => {
            const largeResponse = 'x'.repeat(1000);
            
            expect(() => {
                parser.parseResponse(largeResponse, { maxResponseSize: 500 });
            }).toThrow('Response too large');
        });

        it('should handle malformed YAML in strict mode', () => {
            const response = `---
malformed: yaml: structure
---

Content`;

            expect(() => {
                parser.parseResponse(response, { strictValidation: true });
            }).toThrow();
        });

        it('should handle incomplete frontmatter', () => {
            const response = `---
filename: test.md
no closing delimiter

Content here`;

            expect(() => {
                parser.parseResponse(response);
            }).toThrow('No closing --- found');
        });
    });

    describe('Validation', () => {
        it('should validate correct YAML syntax', () => {
            const validYaml = `---
filename: test.md
category: tasks
---

Content`;

            expect(parser.validateSyntax(validYaml)).toBe(true);
        });

        it('should reject invalid YAML syntax', () => {
            const invalidYaml = `malformed yaml without frontmatter`;
            
            expect(parser.validateSyntax(invalidYaml)).toBe(false);
        });
    });

    describe('Statistics', () => {
        it('should track parsing statistics', () => {
            const response = `---
filename: test.md
---

Content`;

            const initialStats = parser.getStats();
            expect(initialStats.responsesParsed).toBe(0);

            parser.parseResponse(response);

            const updatedStats = parser.getStats();
            expect(updatedStats.responsesParsed).toBe(1);
            expect(updatedStats.totalSections).toBe(1);
            expect(updatedStats.multiFileResponses).toBe(0);
        });

        it('should count multi-file responses correctly', () => {
            const multiResponse = `---
filename: file1.md
---

Content 1

---
filename: file2.md
---

Content 2`;

            parser.parseResponse(multiResponse);

            const stats = parser.getStats();
            expect(stats.multiFileResponses).toBe(1);
            expect(stats.totalSections).toBe(2);
        });
    });
});