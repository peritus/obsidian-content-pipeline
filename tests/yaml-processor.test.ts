/**
 * YAML Processor Tests
 * 
 * Test suite for the YAML frontmatter processing system updated for v1.1 schema.
 * Removed category references and added nextStep routing tests.
 */

import { YamlProcessor, YamlFormatter, YamlParser } from '../src/core/yaml-processor';
import { FileInfo, FileRole, ProcessingContext } from '../src/types';
import { App } from 'obsidian';
import { cleanup, createMockFileInfo, createMockContext, createMockStepRouting } from './setup';

// Mock app for testing
const mockApp = {} as App;

// Mock file info for v1.1 schema
const mockFileInfo: FileInfo = createMockFileInfo({
    name: 'test-audio.mp3',
    path: 'inbox/audio/test-audio.mp3'
});

// Mock processing context for v1.1 schema
const mockContext: ProcessingContext = createMockContext({
    filename: 'test-audio',
    stepId: 'transcribe',
    inputPath: 'inbox/audio/test-audio.mp3',
    outputPath: 'inbox/transcripts/test-audio-transcript.md',
    archivePath: 'inbox/archive/transcribe/test-audio.mp3'
});

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

    describe('Request/Response Flow with Step Routing', () => {
        it('should format and parse a complete request-response cycle with nextStep', async () => {
            // Mock step routing for transcribe step
            const mockRouting = createMockStepRouting();
            
            // Format a request with routing information
            const includeFiles = ['transcriptionprompt.md'];
            const request = await processor.formatRequest(
                mockFileInfo,
                includeFiles,
                mockContext,
                mockRouting.available_next_steps
            );

            expect(request).toContain('---');
            expect(request).toContain('role: input');
            expect(request).toContain('filename: test-audio.mp3');
            expect(request).toContain('role: routing');
            expect(request).toContain('available_next_steps:');
            expect(request).toContain('process-thoughts');
            expect(request).toContain('process-tasks');
            expect(request).toContain('process-ideas');

            // Parse a mock response with nextStep routing
            const mockResponse = `---
filename: transcript.md
nextStep: process-thoughts
---

# Transcript

This is a test transcription containing personal thoughts and reflections.`;

            const parsed = processor.parseResponse(mockResponse);
            expect(parsed.isMultiFile).toBe(false);
            expect(parsed.sections).toHaveLength(1);
            expect(parsed.sections[0].filename).toBe('transcript.md');
            expect(parsed.sections[0].nextStep).toBe('process-thoughts');
            expect(parsed.sections[0].content).toContain('This is a test transcription');
        });

        it('should handle multi-file responses with different nextStep routing', async () => {
            const mockMultiResponse = `---
filename: personal-notes.md
nextStep: process-thoughts
---

# Personal Reflection

This contains personal thoughts about family and hobbies.

---
filename: work-tasks.md
nextStep: process-tasks
---

# Meeting Notes

Action items from today's team meeting.

---
filename: innovation-ideas.md
nextStep: process-ideas
---

# Brainstorming Session

New concepts for product development.`;

            const parsed = processor.parseResponse(mockMultiResponse);
            expect(parsed.isMultiFile).toBe(true);
            expect(parsed.sections).toHaveLength(3);
            
            expect(parsed.sections[0].filename).toBe('personal-notes.md');
            expect(parsed.sections[0].nextStep).toBe('process-thoughts');
            
            expect(parsed.sections[1].filename).toBe('work-tasks.md');
            expect(parsed.sections[1].nextStep).toBe('process-tasks');
            
            expect(parsed.sections[2].filename).toBe('innovation-ideas.md');
            expect(parsed.sections[2].nextStep).toBe('process-ideas');
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

    describe('Request Formatting with Step Routing', () => {
        it('should format basic request with input section', async () => {
            const request = await formatter.formatRequest(
                mockFileInfo,
                [],
                mockContext
            );

            expect(request).toContain('---');
            expect(request).toContain('role: input');
            expect(request).toContain('filename: test-audio.mp3');
            expect(request).toContain('[File not found: inbox/audio/test-audio.mp3]');
        });

        it('should include routing section when specified', async () => {
            const mockRouting = createMockStepRouting();
            const request = await formatter.formatRequest(
                mockFileInfo,
                [],
                mockContext,
                mockRouting.available_next_steps
            );

            expect(request).toContain('role: routing');
            expect(request).toContain('available_next_steps:');
            expect(request).toContain('process-thoughts: "If the document contains personal thoughts');
            expect(request).toContain('process-tasks: "If the document contains work-related content');
            expect(request).toContain('process-ideas: "If the document contains innovative concepts');
        });

        it('should handle include files with proper role assignment', async () => {
            const includeFiles = ['transcriptionprompt.md', 'context.md'];
            const request = await formatter.formatRequest(
                mockFileInfo,
                includeFiles,
                mockContext
            );

            // Should have input section + include sections
            const sections = request.split('---').filter(s => s.trim().length > 0);
            expect(sections.length).toBeGreaterThanOrEqual(3);
            
            expect(request).toContain('role: input');
            expect(request).toContain('role: prompt');
        });

        it('should determine file roles correctly for step routing', async () => {
            const includeFiles = ['step-prompt.md', 'inbox/summary-personal/*'];
            const request = await formatter.formatRequest(
                mockFileInfo,
                includeFiles,
                mockContext
            );

            expect(request).toContain('role: input');
            expect(request).toContain('role: prompt');
            // Glob patterns should be treated as context
            expect(request).toContain('role: context');
        });

        it('should handle complex routing configurations', async () => {
            const complexRouting = {
                'process-thoughts': 'If personal thoughts, family topics (Alice, Bob, Charlotte), hobbies, or private reflections',
                'process-tasks': 'If work meetings, action items, project planning, or business discussions',
                'process-ideas': 'If innovative concepts, brainstorming, or development ideas',
                'summary-work': 'If final work summary is needed',
                'summary-personal': 'If final personal summary is needed'
            };

            const request = await formatter.formatRequest(
                mockFileInfo,
                [],
                mockContext,
                complexRouting
            );

            expect(request).toContain('process-thoughts: If personal thoughts, family topics');
            expect(request).toContain('Alice, Bob, Charlotte');
            expect(request).toContain('summary-work: If final work summary');
            expect(request).toContain('summary-personal: If final personal summary');
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

    describe('Single File Responses with NextStep', () => {
        it('should parse single file with YAML frontmatter and nextStep', () => {
            const response = `---
filename: output.md
nextStep: process-thoughts
---

# Test Output

This is the generated content with routing information.`;

            const parsed = parser.parseResponse(response);
            
            expect(parsed.isMultiFile).toBe(false);
            expect(parsed.sections).toHaveLength(1);
            expect(parsed.sections[0].filename).toBe('output.md');
            expect(parsed.sections[0].nextStep).toBe('process-thoughts');
            expect(parsed.sections[0].content).toContain('This is the generated content');
        });

        it('should parse plain text response without frontmatter', () => {
            const response = 'This is just plain text content without routing.';
            
            const parsed = parser.parseResponse(response);
            
            expect(parsed.isMultiFile).toBe(false);
            expect(parsed.sections).toHaveLength(1);
            expect(parsed.sections[0].filename).toBe('response.md');
            expect(parsed.sections[0].content).toBe(response);
            expect(parsed.sections[0].nextStep).toBeUndefined();
        });

        it('should handle missing filename in frontmatter', () => {
            const response = `---
nextStep: process-tasks
---

Content without filename but with routing.`;

            const parsed = parser.parseResponse(response);
            
            expect(parsed.sections[0].filename).toBe('untitled.md');
            expect(parsed.sections[0].nextStep).toBe('process-tasks');
        });

        it('should handle missing nextStep in frontmatter', () => {
            const response = `---
filename: final-output.md
---

Content without nextStep (indicates end of pipeline).`;

            const parsed = parser.parseResponse(response);
            
            expect(parsed.sections[0].filename).toBe('final-output.md');
            expect(parsed.sections[0].nextStep).toBeUndefined();
        });
    });

    describe('Multi-File Responses with NextStep Routing', () => {
        it('should parse multi-file response with different routing', () => {
            const response = `---
filename: personal-file.md
nextStep: process-thoughts
---

Personal reflections about family and hobbies.

---
filename: work-file.md
nextStep: process-tasks
---

Work-related meeting notes and action items.

---
filename: ideas-file.md
nextStep: process-ideas
---

Innovative concepts for future development.`;

            const parsed = parser.parseResponse(response);
            
            expect(parsed.isMultiFile).toBe(true);
            expect(parsed.sections).toHaveLength(3);
            
            expect(parsed.sections[0].filename).toBe('personal-file.md');
            expect(parsed.sections[0].nextStep).toBe('process-thoughts');
            
            expect(parsed.sections[1].filename).toBe('work-file.md');
            expect(parsed.sections[1].nextStep).toBe('process-tasks');
            
            expect(parsed.sections[2].filename).toBe('ideas-file.md');
            expect(parsed.sections[2].nextStep).toBe('process-ideas');
        });

        it('should handle mixed nextStep presence in multi-file', () => {
            const response = `---
filename: middle-step.md
nextStep: summary-work
---

Content that continues processing.

---
filename: final-step.md
---

Content that ends processing (no nextStep).`;

            const parsed = parser.parseResponse(response);
            
            expect(parsed.isMultiFile).toBe(true);
            expect(parsed.sections).toHaveLength(2);
            
            expect(parsed.sections[0].nextStep).toBe('summary-work');
            expect(parsed.sections[1].nextStep).toBeUndefined();
        });

        it('should handle malformed sections in non-strict mode', () => {
            const response = `---
filename: good.md
nextStep: process-thoughts
---

Good content with routing.

---
malformed frontmatter without nextStep
---

Bad content without proper frontmatter.`;

            const parsed = parser.parseResponse(response, { strictValidation: false });
            
            expect(parsed.sections).toHaveLength(2);
            expect(parsed.sections[0].filename).toBe('good.md');
            expect(parsed.sections[0].nextStep).toBe('process-thoughts');
            expect(parsed.sections[1].filename).toBe('section-2.md'); // Fallback name
            expect(parsed.sections[1].nextStep).toBeUndefined();
        });
    });

    describe('Step Routing Validation', () => {
        it('should validate nextStep field format', () => {
            const response = `---
filename: test.md
nextStep: valid-step-id
---

Content`;

            const parsed = parser.parseResponse(response);
            expect(parsed.sections[0].nextStep).toBe('valid-step-id');
        });

        it('should handle empty nextStep field', () => {
            const response = `---
filename: test.md
nextStep: ""
---

Content`;

            const parsed = parser.parseResponse(response);
            expect(parsed.sections[0].nextStep).toBe('""');
        });

        it('should handle non-string nextStep field', () => {
            const response = `---
filename: test.md
nextStep: 123
---

Content`;

            const parsed = parser.parseResponse(response, { strictValidation: false });
            // Should convert to string or handle gracefully
            expect(typeof parsed.sections[0].nextStep).toBe('string');
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
nextStep: invalid-yaml
---

Content`;

            expect(() => {
                parser.parseResponse(response, { strictValidation: true });
            }).toThrow();
        });

        it('should handle incomplete frontmatter', () => {
            const response = `---
filename: test.md
nextStep: incomplete
no closing delimiter

Content here`;

            expect(() => {
                parser.parseResponse(response);
            }).toThrow('No closing --- found');
        });
    });

    describe('Validation', () => {
        it('should validate correct YAML syntax with nextStep', () => {
            const validYaml = `---
filename: test.md
nextStep: process-thoughts
---

Content`;

            expect(parser.validateSyntax(validYaml)).toBe(true);
        });

        it('should reject invalid YAML syntax', () => {
            const invalidYaml = `malformed yaml without frontmatter`;
            
            expect(parser.validateSyntax(invalidYaml)).toBe(false);
        });

        it('should validate YAML with complex nextStep routing', () => {
            const complexYaml = `---
filename: complex-output.md
nextStep: summary-personal
metadata:
  priority: high
  tags: [personal, family]
---

Complex content with additional metadata.`;

            expect(parser.validateSyntax(complexYaml)).toBe(true);
        });
    });

    describe('Statistics', () => {
        it('should track parsing statistics with nextStep routing', () => {
            const response = `---
filename: test.md
nextStep: process-thoughts
---

Content`;

            const initialStats = parser.getStats();
            expect(initialStats.responsesParsed).toBe(0);

            parser.parseResponse(response);

            const updatedStats = parser.getStats();
            expect(updatedStats.responsesParsed).toBe(1);
            expect(updatedStats.totalSections).toBe(1);
            expect(updatedStats.multiFileResponses).toBe(0);
            expect(updatedStats.routedResponses).toBe(1);
        });

        it('should count multi-file responses with routing correctly', () => {
            const multiResponse = `---
filename: file1.md
nextStep: process-thoughts
---

Content 1

---
filename: file2.md
nextStep: process-tasks
---

Content 2`;

            parser.parseResponse(multiResponse);

            const stats = parser.getStats();
            expect(stats.multiFileResponses).toBe(1);
            expect(stats.totalSections).toBe(2);
            expect(stats.routedResponses).toBe(1);
            expect(stats.sectionsWithRouting).toBe(2);
        });

        it('should track responses without routing', () => {
            const responseWithoutRouting = `---
filename: final.md
---

Final content without nextStep`;

            parser.parseResponse(responseWithoutRouting);

            const stats = parser.getStats();
            expect(stats.routedResponses).toBe(0);
            expect(stats.sectionsWithRouting).toBe(0);
        });
    });
});

describe('YAML Communication Protocol', () => {
    let processor: YamlProcessor;

    beforeEach(() => {
        processor = new YamlProcessor(mockApp);
    });

    afterEach(() => {
        cleanup();
    });

    describe('Request Format for LLM', () => {
        it('should generate proper YAML request structure for step routing', async () => {
            const mockRouting = createMockStepRouting();
            const request = await processor.formatRequest(
                mockFileInfo,
                ['transcriptionprompt.md'],
                mockContext,
                mockRouting.available_next_steps
            );

            // Verify request structure follows specification
            expect(request).toMatch(/---\s*role:\s*input/);
            expect(request).toMatch(/---\s*role:\s*prompt/);
            expect(request).toMatch(/---\s*role:\s*routing/);
            expect(request).toContain('available_next_steps:');
            
            // Verify comprehensive response format instructions are included
            expect(request).toContain('You can return single or multiple files using YAML frontmatter format:');
            expect(request).toContain('For single file:');
            expect(request).toContain('For multiple files:');
            expect(request).toContain('Use the \'nextStep\' field to route content to the most appropriate next processing step');
        });

        it('should handle requests without routing for final steps', async () => {
            const request = await processor.formatRequest(
                mockFileInfo,
                ['summary-prompt.md'],
                mockContext
            );

            expect(request).toContain('role: input');
            expect(request).toContain('role: prompt');
            expect(request).not.toContain('role: routing');
            expect(request).not.toContain('available_next_steps');
        });
    });

    describe('Response Format Validation', () => {
        it('should validate single file response format', () => {
            const validSingleResponse = `---
filename: output.md
nextStep: chosen_step_id
---
Your content here...`;

            const parsed = processor.parseResponse(validSingleResponse);
            expect(parsed.sections[0].filename).toBe('output.md');
            expect(parsed.sections[0].nextStep).toBe('chosen_step_id');
            expect(parsed.sections[0].content).toBe('Your content here...');
        });

        it('should validate multi-file response format', () => {
            const validMultiResponse = `---
filename: doc1.md
nextStep: step_id_1
---
First document content...

---
filename: doc2.md
nextStep: step_id_2
---
Second document content...`;

            const parsed = processor.parseResponse(validMultiResponse);
            expect(parsed.isMultiFile).toBe(true);
            expect(parsed.sections).toHaveLength(2);
            expect(parsed.sections[0].nextStep).toBe('step_id_1');
            expect(parsed.sections[1].nextStep).toBe('step_id_2');
        });
    });
});