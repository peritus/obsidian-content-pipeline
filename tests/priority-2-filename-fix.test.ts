/**
 * Priority 2 Fix Verification Test
 * 
 * Test to verify that filename context generation works correctly
 * based on the priority 2 fix requirements.
 */

import { OutputHandler } from '../src/core/pipeline-executor/StepChain/OutputHandler';
import { App } from 'obsidian';
import { PipelineStep, ProcessingContext, YamlResponseSection } from '../src/types';
import { FileOperationResult } from '../src/core/file-operations/types';
import { cleanup, createMockContext, createMockPipelineStep } from './setup';

// Mock app for testing
const mockApp = {} as App;

// Mock file operation result
const mockFileOperationResult: FileOperationResult = {
    success: true,
    path: 'test-path.md',
    timestamp: new Date()
};

describe('Priority 2 Fix: Filename Context Generation', () => {
    let outputHandler: OutputHandler;
    let mockStep: PipelineStep;
    let mockContext: ProcessingContext;

    beforeEach(() => {
        outputHandler = new OutputHandler(mockApp);
        
        // Create mock step with output pattern
        mockStep = createMockPipelineStep({
            output: 'inbox/process-thoughts/{filename}-processed.md'
        });

        // Create mock context with original filename
        mockContext = createMockContext({
            filename: '2024_11_18T11_53_32_01_00-transcript',
            stepId: 'process-thoughts',
            archivePath: 'inbox/archive/transcribe/2024_11_18T11_53_32_01_00-transcript.md'
        });
    });

    afterEach(() => {
        cleanup();
    });

    describe('Test Case 1: LLM provides custom filename', () => {
        it('should use LLM-provided filename when it is meaningful', async () => {
            // Mock LLM response with custom filename
            const section: YamlResponseSection = {
                filename: 'my-custom-name.md',
                nextStep: 'summary-personal',
                content: 'Processed content here'
            };

            // Mock the file operations to avoid actual file system calls
            const writeFileSpy = jest.spyOn(outputHandler['fileOps'], 'writeFile').mockResolvedValue(mockFileOperationResult);

            await outputHandler.save(section, mockStep, mockContext);

            // Verify that the custom filename was used in the output path
            expect(writeFileSpy).toHaveBeenCalledWith(
                'inbox/process-thoughts/my-custom-name-processed.md',
                expect.stringContaining('Processed content here'),
                expect.any(Object)
            );

            writeFileSpy.mockRestore();
        });
    });

    describe('Test Case 2: LLM provides generic filename', () => {
        it('should fall back to original filename when LLM provides generic filename', async () => {
            // Mock LLM response with generic filename (should trigger fallback)
            const section: YamlResponseSection = {
                filename: 'response.md',
                nextStep: 'summary-personal', 
                content: 'Processed content here'
            };

            // Mock the file operations to avoid actual file system calls
            const writeFileSpy = jest.spyOn(outputHandler['fileOps'], 'writeFile').mockResolvedValue(mockFileOperationResult);

            await outputHandler.save(section, mockStep, mockContext);

            // Verify that the original filename was used instead of the generic one
            expect(writeFileSpy).toHaveBeenCalledWith(
                'inbox/process-thoughts/2024_11_18T11_53_32_01_00-transcript-processed.md',
                expect.stringContaining('Processed content here'),
                expect.any(Object)
            );

            writeFileSpy.mockRestore();
        });
    });

    describe('Test Case 3: LLM does not provide filename', () => {
        it('should fall back to original filename when LLM does not provide filename', async () => {
            // Mock LLM response without filename (using 'untitled.md' as default)
            const section: YamlResponseSection = {
                filename: 'untitled.md', // This is what the YAML parser returns when no filename is provided
                nextStep: 'summary-personal',
                content: 'Processed content here'
            };

            // Mock the file operations to avoid actual file system calls  
            const writeFileSpy = jest.spyOn(outputHandler['fileOps'], 'writeFile').mockResolvedValue(mockFileOperationResult);

            await outputHandler.save(section, mockStep, mockContext);

            // Verify that the original filename was used (untitled.md is generic, so fallback occurs)
            expect(writeFileSpy).toHaveBeenCalledWith(
                'inbox/process-thoughts/2024_11_18T11_53_32_01_00-transcript-processed.md',
                expect.stringContaining('Processed content here'),
                expect.any(Object)
            );

            writeFileSpy.mockRestore();
        });
    });

    describe('Generic filename detection', () => {
        const genericFilenames = [
            'response.md',
            'output.md', 
            'untitled.md',
            'result.md',
            'document.md',
            'response',
            'output',
            'untitled'
        ];

        genericFilenames.forEach(filename => {
            it(`should detect "${filename}" as generic and use original filename`, async () => {
                const section: YamlResponseSection = {
                    filename: filename,
                    nextStep: 'summary-personal',
                    content: 'Processed content here'
                };

                const writeFileSpy = jest.spyOn(outputHandler['fileOps'], 'writeFile').mockResolvedValue(mockFileOperationResult);

                await outputHandler.save(section, mockStep, mockContext);

                // All generic filenames should result in using the original filename
                expect(writeFileSpy).toHaveBeenCalledWith(
                    'inbox/process-thoughts/2024_11_18T11_53_32_01_00-transcript-processed.md',
                    expect.stringContaining('Processed content here'),
                    expect.any(Object)
                );

                writeFileSpy.mockRestore();
            });
        });
    });

    describe('Custom filename detection', () => {
        const customFilenames = [
            'my-personal-thoughts.md',
            'meeting-notes-2024.md',
            'brainstorm-session.md',
            'project-ideas',
            'reflection.md'
        ];

        customFilenames.forEach(filename => {
            it(`should detect "${filename}" as custom and use it`, async () => {
                const section: YamlResponseSection = {
                    filename: filename,
                    nextStep: 'summary-personal', 
                    content: 'Processed content here'
                };

                const writeFileSpy = jest.spyOn(outputHandler['fileOps'], 'writeFile').mockResolvedValue(mockFileOperationResult);

                await outputHandler.save(section, mockStep, mockContext);

                // Custom filenames should be used (basename only, without extension)
                const expectedBasename = filename.includes('.') ? filename.split('.')[0] : filename;
                expect(writeFileSpy).toHaveBeenCalledWith(
                    `inbox/process-thoughts/${expectedBasename}-processed.md`,
                    expect.stringContaining('Processed content here'),
                    expect.any(Object)
                );

                writeFileSpy.mockRestore();
            });
        });
    });

    describe('Metadata generation', () => {
        it('should include correct source path in frontmatter', async () => {
            const section: YamlResponseSection = {
                filename: 'test-file.md',
                nextStep: 'summary-personal',
                content: 'Test content'
            };

            const writeFileSpy = jest.spyOn(outputHandler['fileOps'], 'writeFile').mockResolvedValue(mockFileOperationResult);

            await outputHandler.save(section, mockStep, mockContext);

            // Verify frontmatter contains correct source path with wiki-link format
            const writtenContent = writeFileSpy.mock.calls[0][1] as string;
            expect(writtenContent).toContain('source: [[inbox/archive/transcribe/2024_11_18T11_53_32_01_00-transcript.md]]');
            expect(writtenContent).toContain('step: "process-thoughts"');
            expect(writtenContent).toContain('nextStep: "summary-personal"');

            writeFileSpy.mockRestore();
        });
    });
});