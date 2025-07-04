/**
 * Tests for FileOperations.getFileInfo and integration tests
 * Updated for step-based organization without category system
 */

import { FileOperations } from '../../src/core/file-operations';
import { mockApp, mockVault, createMockTFile, createMockTFolder, resetMocks } from './setup';
import { cleanup } from '../setup';

describe('FileOperations - getFileInfo and Integration', () => {
    let fileOps: FileOperations;

    beforeEach(() => {
        fileOps = new FileOperations(mockApp as any);
        resetMocks();
    });

    afterEach(() => {
        cleanup();
    });

    describe('getFileInfo', () => {
        it('should extract correct file information', () => {
            const mockFile = createMockTFile(
                'recording.mp3',
                'inbox/audio/recording.mp3',
                { size: 5000, mtime: 1640995200000, ctime: 1640995200000 }
            );

            const fileInfo = fileOps.getFileInfo(mockFile);

            expect(fileInfo.name).toBe('recording.mp3');
            expect(fileInfo.path).toBe('inbox/audio/recording.mp3');
            expect(fileInfo.size).toBe(5000);
            expect(fileInfo.extension).toBe('.mp3');
            expect(fileInfo.isProcessable).toBe(true);
            expect(fileInfo.mimeType).toBe('audio/mpeg');
        });

        it('should detect file types correctly for step-based processing', () => {
            const testFiles = [
                { name: 'audio.mp3', path: 'inbox/audio/audio.mp3', expectedProcessable: true, expectedMime: 'audio/mpeg' },
                { name: 'audio.wav', path: 'inbox/audio/audio.wav', expectedProcessable: true, expectedMime: 'audio/wav' },
                { name: 'audio.m4a', path: 'inbox/audio/audio.m4a', expectedProcessable: true, expectedMime: 'audio/mp4' },
                { name: 'transcript.md', path: 'inbox/transcripts/transcript.md', expectedProcessable: true, expectedMime: 'text/markdown' },
                { name: 'notes.txt', path: 'inbox/text/notes.txt', expectedProcessable: true, expectedMime: 'text/plain' },
                { name: 'image.jpg', path: 'inbox/other/image.jpg', expectedProcessable: false, expectedMime: 'image/jpeg' }
            ];

            testFiles.forEach(({ name, path, expectedProcessable, expectedMime }) => {
                const mockFile = createMockTFile(name, path);
                const fileInfo = fileOps.getFileInfo(mockFile);
                
                expect(fileInfo.name).toBe(name);
                expect(fileInfo.path).toBe(path);
                expect(fileInfo.isProcessable).toBe(expectedProcessable);
                expect(fileInfo.mimeType).toBe(expectedMime);
            });
        });

        it('should handle step-based folder structure', () => {
            const stepBasedPaths = [
                'inbox/audio/recording.mp3',
                'inbox/transcripts/recording-transcript.md',
                'inbox/process-thoughts/recording-processed.md',
                'inbox/process-tasks/recording-processed.md',
                'inbox/process-ideas/recording-processed.md',
                'inbox/summary-personal/summary.md',
                'inbox/summary-work/summary.md'
            ];

            stepBasedPaths.forEach(path => {
                const mockFile = createMockTFile('test-file', path);
                const fileInfo = fileOps.getFileInfo(mockFile);
                
                expect(fileInfo.path).toBe(path);
                expect(fileInfo.name).toBe('test-file');
                // No category field should be present
                expect(fileInfo).not.toHaveProperty('category');
            });
        });

        it('should handle archive structure by step', () => {
            const archivePaths = [
                'inbox/archive/transcribe/audio-001.mp3',
                'inbox/archive/process-thoughts/transcript-001.md',
                'inbox/archive/process-tasks/transcript-002.md',
                'inbox/archive/summary-personal/processed-content.md'
            ];

            archivePaths.forEach(path => {
                const mockFile = createMockTFile('archived-file', path);
                const fileInfo = fileOps.getFileInfo(mockFile);
                
                expect(fileInfo.path).toBe(path);
                expect(fileInfo.name).toBe('archived-file');
            });
        });

        it('should determine MIME types for all supported file extensions', () => {
            const fileExtensions = [
                { ext: '.mp3', mime: 'audio/mpeg' },
                { ext: '.wav', mime: 'audio/wav' },
                { ext: '.m4a', mime: 'audio/mp4' },
                { ext: '.mp4', mime: 'video/mp4' },
                { ext: '.md', mime: 'text/markdown' },
                { ext: '.txt', mime: 'text/plain' }
            ];

            fileExtensions.forEach(({ ext, mime }) => {
                const mockFile = createMockTFile(`test${ext}`, `inbox/test${ext}`);
                const fileInfo = fileOps.getFileInfo(mockFile);
                
                expect(fileInfo.extension).toBe(ext);
                expect(fileInfo.mimeType).toBe(mime);
            });
        });
    });

    describe('Integration Tests', () => {
        beforeEach(() => {
            // Reset mocks before each integration test for better isolation
            resetMocks();
        });

        it('should handle complete step-based processing workflow', async () => {
            // Mock a complete workflow: audio -> transcribe -> process -> summarize -> archive
            const originalAudio = 'binary audio data';
            const transcriptContent = '# Transcript\n\nThis is a transcription of personal thoughts.';
            const processedContent = '# Processed Thoughts\n\nThis content has been analyzed and categorized.';
            
            const audioFile = createMockTFile('recording.mp3', 'inbox/audio/recording.mp3');
            const transcriptFile = createMockTFile('recording-transcript.md', 'inbox/transcripts/recording-transcript.md');
            const processedFile = createMockTFile('recording-processed.md', 'inbox/process-thoughts/recording-processed.md');
            const archivedFile = createMockTFile('recording.mp3', 'inbox/archive/transcribe/recording.mp3');

            // Setup mocks for step-based workflow
            mockVault.getAbstractFileByPath.mockImplementation((path: string) => {
                if (path === 'inbox/audio/recording.mp3') return audioFile;
                if (path === 'inbox/transcripts/recording-transcript.md') return null; // Doesn't exist yet
                if (path === 'inbox/process-thoughts/recording-processed.md') return null; // Doesn't exist yet
                if (path === 'inbox/archive/transcribe') return null; // Directory doesn't exist
                return null;
            });

            mockVault.read.mockResolvedValue(originalAudio);
            mockVault.create.mockImplementation((path: string, content: string) => {
                if (path === 'inbox/transcripts/recording-transcript.md') return Promise.resolve(transcriptFile);
                if (path === 'inbox/process-thoughts/recording-processed.md') return Promise.resolve(processedFile);
                return Promise.resolve(createMockTFile('new-file', path));
            });
            mockVault.createFolder.mockResolvedValue(createMockTFolder('archive', 'inbox/archive/transcribe'));
            mockVault.rename.mockResolvedValue(archivedFile);

            // Step 1: Read source audio file
            const audioContent = await fileOps.readFile('inbox/audio/recording.mp3');
            expect(audioContent).toBe(originalAudio);

            // Step 2: Write transcript (from transcribe step)
            const transcriptResult = await fileOps.writeFile('inbox/transcripts/recording-transcript.md', transcriptContent);
            expect(transcriptResult.success).toBe(true);

            // Step 3: Write processed content (from process-thoughts step)
            const processedResult = await fileOps.writeFile('inbox/process-thoughts/recording-processed.md', processedContent);
            expect(processedResult.success).toBe(true);

            // Step 4: Archive original file to step-specific archive
            const archiveResult = await fileOps.archiveFile('inbox/audio/recording.mp3', 'inbox/archive/transcribe/');
            expect(archiveResult.success).toBe(true);
        });

        it('should handle multi-file output from single step', async () => {
            // Reset mocks to ensure clean state for this test
            resetMocks();
            
            // Test scenario where one step produces multiple output files
            const inputFile = createMockTFile('mixed-content.md', 'inbox/transcripts/mixed-content.md');
            const personalFile = createMockTFile('personal-notes.md', 'inbox/process-thoughts/personal-notes.md');
            const workFile = createMockTFile('work-tasks.md', 'inbox/process-tasks/work-tasks.md');

            // Setup mocks with clean isolated state for this specific test
            mockVault.getAbstractFileByPath.mockImplementation((path: string) => {
                if (path === 'inbox/transcripts/mixed-content.md') return inputFile;
                // For directories that need to be created, return null so they can be created
                if (path === 'inbox/process-thoughts') return null; // Ensure directory can be created
                if (path === 'inbox/process-tasks') return null; // Ensure directory can be created
                if (path.includes('personal-notes.md')) return null; // File doesn't exist yet
                if (path.includes('work-tasks.md')) return null; // File doesn't exist yet
                return null;
            });
            
            mockVault.read.mockResolvedValue('Mixed content with both personal and work items');
            mockVault.create.mockImplementation((path: string) => {
                if (path.includes('personal-notes.md')) return Promise.resolve(personalFile);
                if (path.includes('work-tasks.md')) return Promise.resolve(workFile);
                return Promise.resolve(createMockTFile('default', path));
            });

            // Mock createFolder to succeed for the directories we need
            mockVault.createFolder.mockImplementation((path: string) => {
                if (path.includes('process-thoughts')) {
                    return Promise.resolve(createMockTFolder('process-thoughts', 'inbox/process-thoughts'));
                }
                if (path.includes('process-tasks')) {
                    return Promise.resolve(createMockTFolder('process-tasks', 'inbox/process-tasks'));
                }
                return Promise.resolve(createMockTFolder('default', path));
            });

            // Read input
            const content = await fileOps.readFile('inbox/transcripts/mixed-content.md');
            expect(content).toBeDefined();

            // Write multiple outputs with different routing
            const personalResult = await fileOps.writeFile('inbox/process-thoughts/personal-notes.md', 'Personal content here');
            const workResult = await fileOps.writeFile('inbox/process-tasks/work-tasks.md', 'Work content here');

            expect(personalResult.success).toBe(true);
            expect(workResult.success).toBe(true);
        });

        it('should handle directory-only outputs for summary steps', async () => {
            // Reset mocks to ensure clean state
            resetMocks();
            
            // Test summary steps that output to directories rather than specific files
            const summaryContent = '# Weekly Personal Summary\n\nThis week\'s personal insights...';
            
            mockVault.getAbstractFileByPath.mockImplementation((path: string) => {
                if (path === 'inbox/summary-personal') return createMockTFolder('summary-personal', 'inbox/summary-personal');
                return null;
            });

            mockVault.create.mockResolvedValue(
                createMockTFile('weekly-summary.md', 'inbox/summary-personal/weekly-summary.md')
            );

            // Write to summary directory
            const summaryResult = await fileOps.writeFile('inbox/summary-personal/weekly-summary.md', summaryContent);
            expect(summaryResult.success).toBe(true);
        });

        it('should handle include file resolution for step contexts', async () => {
            // Reset mocks to ensure clean state
            resetMocks();
            
            // Test that include files are properly resolved for different steps
            const includeFiles = [
                'transcriptionprompt.md',
                'process-thoughts-prompt.md',
                'inbox/summary-personal/previous-summary.md'
            ];

            mockVault.getAbstractFileByPath.mockImplementation((path: string) => {
                if (includeFiles.some(f => path.includes(f))) {
                    return createMockTFile(path.split('/').pop() || 'file', path);
                }
                return null;
            });

            mockVault.read.mockImplementation((file: any) => {
                if (file.path.includes('transcriptionprompt.md')) {
                    return Promise.resolve('Transcription instructions...');
                }
                if (file.path.includes('process-thoughts-prompt.md')) {
                    return Promise.resolve('Process personal thoughts with empathy...');
                }
                if (file.path.includes('previous-summary.md')) {
                    return Promise.resolve('Previous personal summary for context...');
                }
                return Promise.resolve('Generic content');
            });

            // Test reading different types of include files
            for (const filePath of includeFiles) {
                const content = await fileOps.readFile(filePath);
                expect(content).toBeDefined();
                expect(typeof content).toBe('string');
            }
        });

        it('should handle error recovery in step-based workflow', async () => {
            // Reset mocks to ensure clean state
            resetMocks();
            
            // Test that errors in one step don't break the entire pipeline
            mockVault.getAbstractFileByPath.mockReturnValue(null);

            // Reading non-existent file should throw
            await expect(fileOps.readFile('nonexistent.mp3')).rejects.toThrow();

            // But writing to next step should still work
            mockVault.create.mockResolvedValue(createMockTFile('new.md', 'inbox/transcripts/new.md'));
            const writeResult = await fileOps.writeFile('inbox/transcripts/new.md', 'Transcription content');
            expect(writeResult.success).toBe(true);
        });

        it('should handle step-based archive paths correctly', async () => {
            // Test that files are archived to the correct step-specific directories
            const testFiles = [
                { input: 'inbox/audio/test1.mp3', step: 'transcribe', expectedArchive: 'inbox/archive/transcribe/' },
                { input: 'inbox/transcripts/test2.md', step: 'process-thoughts', expectedArchive: 'inbox/archive/process-thoughts/' },
                { input: 'inbox/process-thoughts/test3.md', step: 'summary-personal', expectedArchive: 'inbox/archive/summary-personal/' }
            ];

            // Use for...of loop instead of forEach to properly handle async operations
            for (const { input, step, expectedArchive } of testFiles) {
                // Reset mocks for each iteration to avoid cross-contamination
                resetMocks();
                
                // Use unique file names to avoid conflicts
                const fileName = input.split('/').pop() || 'test-file';
                const mockFile = createMockTFile(fileName, input);
                const archivedFile = createMockTFile(fileName, `${expectedArchive}/${fileName}`);

                // Setup mocks for this specific test case
                mockVault.getAbstractFileByPath.mockImplementation((path: string) => {
                    if (path === input) return mockFile;
                    if (path === expectedArchive) return null; // Directory doesn't exist yet
                    return null;
                });
                
                mockVault.createFolder.mockResolvedValue(createMockTFolder(step, expectedArchive));
                mockVault.rename.mockResolvedValue(archivedFile);

                const archiveResult = await fileOps.archiveFile(input, expectedArchive);
                
                expect(archiveResult.success).toBe(true);
            }
        });
    });
});
