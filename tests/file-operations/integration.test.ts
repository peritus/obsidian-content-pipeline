/**
 * Tests for FileOperations.getFileInfo and integration tests
 */

import { FileOperations } from '../../src/core/file-operations';
import { mockApp, mockVault, MockTFile, MockTFolder, resetMocks } from './setup';
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
            const mockFile = new MockTFile(
                'recording.mp3',
                'inbox/audio/tasks/recording.mp3',
                { size: 5000, mtime: 1640995200000, ctime: 1640995200000 }
            );

            const fileInfo = fileOps.getFileInfo(mockFile);

            expect(fileInfo.name).toBe('recording.mp3');
            expect(fileInfo.path).toBe('inbox/audio/tasks/recording.mp3');
            expect(fileInfo.size).toBe(5000);
            expect(fileInfo.extension).toBe('.mp3');
            expect(fileInfo.category).toBe('tasks');
            expect(fileInfo.isProcessable).toBe(true);
            expect(fileInfo.mimeType).toBe('audio/mpeg');
        });

        it('should detect category from path', () => {
            const paths = [
                'inbox/audio/work-meetings/file.mp3',
                'inbox/transcripts/personal/file.md',
                'inbox/results/thoughts/file.md',
                'inbox/summary/ideas/file.md'
            ];

            const expectedCategories = ['work-meetings', 'personal', 'thoughts', 'ideas'];

            paths.forEach((path, index) => {
                const mockFile = new MockTFile('file', path);
                const fileInfo = fileOps.getFileInfo(mockFile);
                expect(fileInfo.category).toBe(expectedCategories[index]);
            });
        });

        it('should default to uncategorized for unknown paths', () => {
            const mockFile = new MockTFile('file.md', 'random/path/file.md');
            const fileInfo = fileOps.getFileInfo(mockFile);
            expect(fileInfo.category).toBe('uncategorized');
        });
    });

    describe('Integration Tests', () => {
        it('should handle complete file processing workflow', async () => {
            // Mock a complete workflow: read -> process -> write -> archive
            const sourceContent = 'original content';
            const processedContent = 'processed content';
            const sourceFile = new MockTFile('input.md', 'inbox/input.md');
            const outputFile = new MockTFile('output.md', 'results/output.md');
            const archivedFile = new MockTFile('input.md', 'archive/input.md');

            // Setup mocks for read
            mockVault.getAbstractFileByPath.mockImplementation((path: string) => {
                if (path === 'inbox/input.md') return sourceFile;
                if (path === 'results/output.md') return null; // Doesn't exist yet
                if (path === 'archive') return null; // Directory doesn't exist
                return null;
            });

            mockVault.read.mockResolvedValue(sourceContent);
            mockVault.create.mockResolvedValue(outputFile);
            mockVault.createFolder.mockResolvedValue(new MockTFolder('archive', 'archive'));
            mockVault.rename.mockResolvedValue(archivedFile);

            // Step 1: Read source file
            const content = await fileOps.readFile('inbox/input.md');
            expect(content).toBe(sourceContent);

            // Step 2: Write processed result
            const writeResult = await fileOps.writeFile('results/output.md', processedContent);
            expect(writeResult.success).toBe(true);

            // Step 3: Archive original file
            const context = { category: 'tasks', stepId: 'process' };
            const archiveResult = await fileOps.archiveFile('inbox/input.md', 'archive', context);
            expect(archiveResult.success).toBe(true);
        });

        it('should handle error recovery in workflow', async () => {
            // Test that errors in one operation don't break the entire workflow
            mockVault.getAbstractFileByPath.mockReturnValue(null);

            // Reading non-existent file should throw
            await expect(fileOps.readFile('nonexistent.md')).rejects.toThrow();

            // But writing should still work
            mockVault.create.mockResolvedValue(new MockTFile('new.md', 'new.md'));
            const writeResult = await fileOps.writeFile('new.md', 'content');
            expect(writeResult.success).toBe(true);
        });
    });
});
