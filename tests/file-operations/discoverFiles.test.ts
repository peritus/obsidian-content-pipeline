/**
 * Tests for FileOperations.discoverFiles method
 */

import { FileOperations } from '../../src/core/file-operations';
import { mockApp, mockVault, MockTFile, MockTFolder, resetMocks } from './setup';
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
        const mockFile1 = new MockTFile('file1.md', 'inbox/tasks/file1.md');
        const mockFile2 = new MockTFile('file2.md', 'inbox/tasks/file2.md');
        const mockFolder = new MockTFolder('tasks', 'inbox/tasks', [mockFile1, mockFile2]);

        mockVault.getAbstractFileByPath.mockReturnValue(mockFolder);
        mockVault.getMarkdownFiles.mockReturnValue([mockFile1, mockFile2]);
        mockVault.getFiles.mockReturnValue([mockFile1, mockFile2]);

        const files = await fileOps.discoverFiles('inbox/tasks', { category: 'tasks' });

        expect(files).toHaveLength(2);
        expect(files[0].name).toBe('file1.md');
        expect(files[1].name).toBe('file2.md');
    });

    it('should expand categories when needed', async () => {
        // Test discovering files across multiple categories
        mockVault.getAbstractFileByPath.mockReturnValue(null); // No specific folder found
        mockVault.getMarkdownFiles.mockReturnValue([]);
        mockVault.getFiles.mockReturnValue([]);

        const files = await fileOps.discoverFiles('inbox/audio/{category}');

        expect(files).toHaveLength(0); // No files found but no error
    });

    it('should filter by extensions', async () => {
        const mdFile = new MockTFile('file.md', 'folder/file.md');
        const txtFile = new MockTFile('file.txt', 'folder/file.txt');
        const mp3File = new MockTFile('file.mp3', 'folder/file.mp3');
        const mockFolder = new MockTFolder('folder', 'folder', [mdFile, txtFile, mp3File]);

        mockVault.getAbstractFileByPath.mockReturnValue(mockFolder);
        mockVault.getMarkdownFiles.mockReturnValue([mdFile]);
        mockVault.getFiles.mockReturnValue([mdFile, txtFile, mp3File]);

        const files = await fileOps.discoverFiles('folder', {}, { extensions: ['.md', '.txt'] });

        expect(files).toHaveLength(2);
        expect(files.some(f => f.name === 'file.md')).toBe(true);
        expect(files.some(f => f.name === 'file.txt')).toBe(true);
        expect(files.some(f => f.name === 'file.mp3')).toBe(false);
    });

    it('should sort files correctly', async () => {
        const file1 = new MockTFile('b.md', 'b.md', { size: 100, mtime: 1000, ctime: 1000 });
        const file2 = new MockTFile('a.md', 'a.md', { size: 200, mtime: 2000, ctime: 2000 });
        const mockFolder = new MockTFolder('folder', 'folder', [file1, file2]);

        mockVault.getAbstractFileByPath.mockReturnValue(mockFolder);
        mockVault.getMarkdownFiles.mockReturnValue([file1, file2]);
        mockVault.getFiles.mockReturnValue([file1, file2]);

        // Test name sorting
        const filesByName = await fileOps.discoverFiles('folder', {}, { sortBy: 'name' });
        expect(filesByName[0].name).toBe('a.md');
        expect(filesByName[1].name).toBe('b.md');

        // Test size sorting
        const filesBySize = await fileOps.discoverFiles('folder', {}, { sortBy: 'size' });
        expect(filesBySize[0].size).toBe(100);
        expect(filesBySize[1].size).toBe(200);
    });

    it('should limit results', async () => {
        const files = Array.from({ length: 10 }, (_, i) => 
            new MockTFile(`file${i}.md`, `file${i}.md`)
        );
        const mockFolder = new MockTFolder('folder', 'folder', files);

        mockVault.getAbstractFileByPath.mockReturnValue(mockFolder);
        mockVault.getMarkdownFiles.mockReturnValue(files);
        mockVault.getFiles.mockReturnValue(files);

        const limitedFiles = await fileOps.discoverFiles('folder', {}, { limit: 5 });

        expect(limitedFiles).toHaveLength(5);
    });
});
