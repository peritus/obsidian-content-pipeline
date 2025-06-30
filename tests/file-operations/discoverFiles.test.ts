/**
 * Tests for FileOperations.discoverFiles method
 * Updated without category system
 */

import { FileOperations } from '../../src/core/file-operations';
import { mockApp, mockVault, createMockTFile, createMockTFolder, resetMocks } from './setup';
import { cleanup } from '../setup';

describe('FileOperations - discoverFiles', () => {
    let fileOps: FileOperations;

    beforeEach(() => {
        fileOps = new FileOperations(mockApp as any);
        resetMocks();
    });

    afterEach(() => {
        cleanup();
    });

    it('should discover files in single path', async () => {
        const mockFile1 = createMockTFile('file1.md', 'inbox/transcripts/file1.md');
        const mockFile2 = createMockTFile('file2.md', 'inbox/transcripts/file2.md');
        const mockFolder = createMockTFolder('transcripts', 'inbox/transcripts', [mockFile1, mockFile2]);

        mockVault.getAbstractFileByPath.mockReturnValue(mockFolder);
        // Mock the vault methods to return files that start with the path
        mockVault.getMarkdownFiles.mockReturnValue([mockFile1, mockFile2]);
        mockVault.getFiles.mockReturnValue([mockFile1, mockFile2]);

        const files = await fileOps.discoverFiles('inbox/transcripts', { stepId: 'transcribe' });

        expect(files).toHaveLength(2);
        expect(files[0].name).toBe('file1.md');
        expect(files[1].name).toBe('file2.md');
    });

    it('should handle step-based paths', async () => {
        // Test discovering files in step-based directories
        mockVault.getAbstractFileByPath.mockReturnValue(null); // No specific folder found
        mockVault.getMarkdownFiles.mockReturnValue([]);
        mockVault.getFiles.mockReturnValue([]);

        const files = await fileOps.discoverFiles('inbox/process-thoughts');

        expect(files).toHaveLength(0); // No files found but no error
    });

    it('should filter by extensions', async () => {
        const mdFile = createMockTFile('file.md', 'folder/file.md');
        const txtFile = createMockTFile('file.txt', 'folder/file.txt');
        const mp3File = createMockTFile('file.mp3', 'folder/file.mp3');
        const mockFolder = createMockTFolder('folder', 'folder', [mdFile, txtFile, mp3File]);

        mockVault.getAbstractFileByPath.mockReturnValue(mockFolder);
        // Return files that start with the folder path
        mockVault.getMarkdownFiles.mockReturnValue([mdFile]);
        mockVault.getFiles.mockReturnValue([mdFile, txtFile, mp3File]);

        const files = await fileOps.discoverFiles('folder', {}, { extensions: ['.md', '.txt'] });

        expect(files).toHaveLength(2);
        expect(files.some(f => f.name === 'file.md')).toBe(true);
        expect(files.some(f => f.name === 'file.txt')).toBe(true);
        expect(files.some(f => f.name === 'file.mp3')).toBe(false);
    });

    it('should sort files correctly', async () => {
        const file1 = createMockTFile('b.md', 'folder/b.md', { size: 100, mtime: 1000, ctime: 1000 });
        const file2 = createMockTFile('a.md', 'folder/a.md', { size: 200, mtime: 2000, ctime: 2000 });
        const mockFolder = createMockTFolder('folder', 'folder', [file1, file2]);

        mockVault.getAbstractFileByPath.mockReturnValue(mockFolder);
        // Return files in the order they should be discovered
        mockVault.getMarkdownFiles.mockReturnValue([file1, file2]);
        mockVault.getFiles.mockReturnValue([file1, file2]);

        // Test name sorting
        const filesByName = await fileOps.discoverFiles('folder', {}, { sortBy: 'name' });
        expect(filesByName).toHaveLength(2);
        expect(filesByName[0].name).toBe('a.md');
        expect(filesByName[1].name).toBe('b.md');

        // Test size sorting
        const filesBySize = await fileOps.discoverFiles('folder', {}, { sortBy: 'size' });
        expect(filesBySize).toHaveLength(2);
        expect(filesBySize[0].size).toBe(100);
        expect(filesBySize[1].size).toBe(200);
    });

    it('should limit results', async () => {
        const files = Array.from({ length: 10 }, (_, i) => 
            createMockTFile(`file${i}.md`, `folder/file${i}.md`)
        );
        const mockFolder = createMockTFolder('folder', 'folder', files);

        mockVault.getAbstractFileByPath.mockReturnValue(mockFolder);
        // Return files that start with the folder path
        mockVault.getMarkdownFiles.mockReturnValue(files);
        mockVault.getFiles.mockReturnValue(files);

        const limitedFiles = await fileOps.discoverFiles('folder', {}, { limit: 5 });

        expect(limitedFiles).toHaveLength(5);
    });
});
