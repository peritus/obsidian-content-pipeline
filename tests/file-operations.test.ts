/**
 * File Operations Tests
 * 
 * Comprehensive test suite for the file operations system.
 */

import { FileOperations, FileUtils } from '../src/core/file-operations';
import { PathContext, FileInfo } from '../src/types';
import { createMockContext, cleanup } from './setup';

// Extended mock for Obsidian file system
const mockVault = {
    read: jest.fn(),
    create: jest.fn(),
    modify: jest.fn(),
    rename: jest.fn(),
    delete: jest.fn(),
    createFolder: jest.fn(),
    getAbstractFileByPath: jest.fn(),
    getMarkdownFiles: jest.fn().mockReturnValue([]),
    getFiles: jest.fn().mockReturnValue([])
};

const mockApp = {
    vault: mockVault
};

// Mock TFile and TFolder
class MockTFile {
    constructor(
        public name: string,
        public path: string,
        public stat: { size: number; mtime: number; ctime: number } = {
            size: 1000,
            mtime: Date.now(),
            ctime: Date.now()
        }
    ) {}
}

class MockTFolder {
    constructor(
        public name: string,
        public path: string,
        public children: (MockTFile | MockTFolder)[] = []
    ) {}
}

// Mock normalizePath
jest.mock('obsidian', () => ({
    ...jest.requireActual('obsidian'),
    normalizePath: jest.fn((path: string) => path),
    TFile: MockTFile,
    TFolder: MockTFolder
}));

describe('FileOperations', () => {
    let fileOps: FileOperations;

    beforeEach(() => {
        fileOps = new FileOperations(mockApp as any);
        // Reset all mocks
        Object.values(mockVault).forEach(mock => {
            if (jest.isMockFunction(mock)) {
                mock.mockReset();
            }
        });
    });

    afterEach(() => {
        cleanup();
    });

    describe('readFile', () => {
        it('should read file content successfully', async () => {
            const mockFile = new MockTFile('test.md', 'test.md');
            const mockContent = 'file content';

            mockVault.getAbstractFileByPath.mockReturnValue(mockFile);
            mockVault.read.mockResolvedValue(mockContent);

            const content = await fileOps.readFile('test.md');

            expect(content).toBe(mockContent);
            expect(mockVault.getAbstractFileByPath).toHaveBeenCalledWith('test.md');
            expect(mockVault.read).toHaveBeenCalledWith(mockFile);
        });

        it('should throw error if file not found', async () => {
            mockVault.getAbstractFileByPath.mockReturnValue(null);

            await expect(fileOps.readFile('nonexistent.md')).rejects.toThrow('File not found');
        });

        it('should throw error if path is a directory', async () => {
            const mockFolder = new MockTFolder('folder', 'folder');
            mockVault.getAbstractFileByPath.mockReturnValue(mockFolder);

            await expect(fileOps.readFile('folder')).rejects.toThrow('Path is not a file');
        });

        it('should handle vault read errors', async () => {
            const mockFile = new MockTFile('test.md', 'test.md');
            mockVault.getAbstractFileByPath.mockReturnValue(mockFile);
            mockVault.read.mockRejectedValue(new Error('Read failed'));

            await expect(fileOps.readFile('test.md')).rejects.toThrow('Failed to read file');
        });
    });

    describe('writeFile', () => {
        it('should create new file successfully', async () => {
            const mockFile = new MockTFile('new.md', 'new.md');
            mockVault.getAbstractFileByPath.mockReturnValue(null);
            mockVault.create.mockResolvedValue(mockFile);

            const result = await fileOps.writeFile('new.md', 'content');

            expect(result.success).toBe(true);
            expect(result.path).toBe('new.md');
            expect(result.file).toBe(mockFile);
            expect(mockVault.create).toHaveBeenCalledWith('new.md', 'content');
        });

        it('should modify existing file when overwrite is enabled', async () => {
            const mockFile = new MockTFile('existing.md', 'existing.md');
            mockVault.getAbstractFileByPath.mockReturnValue(mockFile);
            mockVault.modify.mockResolvedValue(undefined);

            const result = await fileOps.writeFile('existing.md', 'new content', { overwrite: true });

            expect(result.success).toBe(true);
            expect(mockVault.modify).toHaveBeenCalledWith(mockFile, 'new content');
        });

        it('should fail if file exists and overwrite is disabled', async () => {
            const mockFile = new MockTFile('existing.md', 'existing.md');
            mockVault.getAbstractFileByPath.mockReturnValue(mockFile);

            await expect(fileOps.writeFile('existing.md', 'content', { overwrite: false }))
                .rejects.toThrow('File already exists');
        });

        it('should create parent directories when enabled', async () => {
            mockVault.getAbstractFileByPath
                .mockReturnValueOnce(null) // Directory doesn't exist
                .mockReturnValueOnce(null); // File doesn't exist
            
            const mockFolder = new MockTFolder('parent', 'parent');
            const mockFile = new MockTFile('file.md', 'parent/file.md');
            
            mockVault.createFolder.mockResolvedValue(mockFolder);
            mockVault.create.mockResolvedValue(mockFile);

            const result = await fileOps.writeFile('parent/file.md', 'content', { createDirectories: true });

            expect(result.success).toBe(true);
            expect(mockVault.createFolder).toHaveBeenCalledWith('parent');
        });

        it('should handle write errors gracefully', async () => {
            mockVault.getAbstractFileByPath.mockReturnValue(null);
            mockVault.create.mockRejectedValue(new Error('Write failed'));

            const result = await fileOps.writeFile('test.md', 'content');

            expect(result.success).toBe(false);
            expect(result.error).toContain('Write failed');
        });
    });

    describe('ensureDirectory', () => {
        it('should return existing directory', async () => {
            const mockFolder = new MockTFolder('existing', 'existing');
            mockVault.getAbstractFileByPath.mockReturnValue(mockFolder);

            const result = await fileOps.ensureDirectory('existing');

            expect(result).toBe(mockFolder);
            expect(mockVault.createFolder).not.toHaveBeenCalled();
        });

        it('should create new directory', async () => {
            const mockFolder = new MockTFolder('new', 'new');
            mockVault.getAbstractFileByPath.mockReturnValue(null);
            mockVault.createFolder.mockResolvedValue(mockFolder);

            const result = await fileOps.ensureDirectory('new');

            expect(result).toBe(mockFolder);
            expect(mockVault.createFolder).toHaveBeenCalledWith('new');
        });

        it('should throw error if path exists as file', async () => {
            const mockFile = new MockTFile('file.md', 'file.md');
            mockVault.getAbstractFileByPath.mockReturnValue(mockFile);

            await expect(fileOps.ensureDirectory('file.md'))
                .rejects.toThrow('Path exists as file, not directory');
        });

        it('should handle creation errors', async () => {
            mockVault.getAbstractFileByPath.mockReturnValue(null);
            mockVault.createFolder.mockRejectedValue(new Error('Create failed'));

            await expect(fileOps.ensureDirectory('new')).rejects.toThrow('Failed to create directory');
        });
    });

    describe('archiveFile', () => {
        it('should archive file successfully', async () => {
            const sourceFile = new MockTFile('source.md', 'inbox/source.md');
            const archivedFile = new MockTFile('source.md', 'archive/tasks/source.md');
            const context = createMockContext({ category: 'tasks', stepId: 'transcribe' });

            mockVault.getAbstractFileByPath
                .mockReturnValueOnce(sourceFile) // Source file exists
                .mockReturnValueOnce(null) // Archive directory doesn't exist
                .mockReturnValueOnce(null); // Archive file doesn't exist

            const mockFolder = new MockTFolder('archive', 'archive/transcribe/tasks');
            mockVault.createFolder.mockResolvedValue(mockFolder);
            mockVault.rename.mockResolvedValue(archivedFile);

            const result = await fileOps.archiveFile(
                'inbox/source.md',
                'archive/{stepId}/{category}',
                context
            );

            expect(result.success).toBe(true);
            expect(result.originalPath).toBe('inbox/source.md');
            expect(result.archivedFile).toBe(archivedFile);
        });

        it('should fail if source file not found', async () => {
            mockVault.getAbstractFileByPath.mockReturnValue(null);
            const context = createMockContext();

            const result = await fileOps.archiveFile(
                'nonexistent.md',
                'archive/{category}',
                context
            );

            expect(result.success).toBe(false);
            expect(result.error).toContain('Source file not found');
        });

        it('should handle incomplete archive path resolution', async () => {
            const sourceFile = new MockTFile('source.md', 'source.md');
            mockVault.getAbstractFileByPath.mockReturnValue(sourceFile);

            const incompleteContext = {}; // Missing required variables

            await expect(fileOps.archiveFile(
                'source.md',
                'archive/{category}/{stepId}',
                incompleteContext
            )).rejects.toThrow('Cannot resolve archive path');
        });
    });

    describe('discoverFiles', () => {
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

    describe('file existence checks', () => {
        it('should check file existence correctly', () => {
            const mockFile = new MockTFile('exists.md', 'exists.md');
            mockVault.getAbstractFileByPath
                .mockReturnValueOnce(mockFile)
                .mockReturnValueOnce(null);

            expect(fileOps.fileExists('exists.md')).toBe(true);
            expect(fileOps.fileExists('nonexistent.md')).toBe(false);
        });

        it('should check directory existence correctly', () => {
            const mockFolder = new MockTFolder('exists', 'exists');
            mockVault.getAbstractFileByPath
                .mockReturnValueOnce(mockFolder)
                .mockReturnValueOnce(null);

            expect(fileOps.directoryExists('exists')).toBe(true);
            expect(fileOps.directoryExists('nonexistent')).toBe(false);
        });
    });

    describe('deleteFile', () => {
        it('should delete file successfully', async () => {
            const mockFile = new MockTFile('delete.md', 'delete.md');
            mockVault.getAbstractFileByPath.mockReturnValue(mockFile);
            mockVault.delete.mockResolvedValue(undefined);

            const result = await fileOps.deleteFile('delete.md');

            expect(result).toBe(true);
            expect(mockVault.delete).toHaveBeenCalledWith(mockFile);
        });

        it('should handle file not found', async () => {
            mockVault.getAbstractFileByPath.mockReturnValue(null);

            await expect(fileOps.deleteFile('nonexistent.md')).rejects.toThrow('File not found');
        });

        it('should handle deletion errors', async () => {
            const mockFile = new MockTFile('error.md', 'error.md');
            mockVault.getAbstractFileByPath.mockReturnValue(mockFile);
            mockVault.delete.mockRejectedValue(new Error('Delete failed'));

            const result = await fileOps.deleteFile('error.md');

            expect(result).toBe(false);
        });
    });
});

describe('FileUtils', () => {
    afterEach(() => {
        cleanup();
    });

    describe('isVaultSafePath', () => {
        it('should accept safe paths', () => {
            expect(FileUtils.isVaultSafePath('inbox/audio/file.mp3')).toBe(true);
            expect(FileUtils.isVaultSafePath('folder/subfolder/file.md')).toBe(true);
            expect(FileUtils.isVaultSafePath('file.txt')).toBe(true);
        });

        it('should reject unsafe paths', () => {
            expect(FileUtils.isVaultSafePath('../outside/vault')).toBe(false);
            expect(FileUtils.isVaultSafePath('/absolute/path')).toBe(false);
            expect(FileUtils.isVaultSafePath('')).toBe(false);
            expect(FileUtils.isVaultSafePath('path/../traversal')).toBe(false);
        });
    });

    describe('processable extensions', () => {
        it('should identify processable extensions', () => {
            const processable = ['.mp3', '.wav', '.m4a', '.mp4', '.md', '.txt'];
            const nonProcessable = ['.jpg', '.png', '.pdf', '.doc'];

            processable.forEach(ext => {
                expect(FileUtils.isProcessableExtension(ext)).toBe(true);
            });

            nonProcessable.forEach(ext => {
                expect(FileUtils.isProcessableExtension(ext)).toBe(false);
            });
        });

        it('should return correct processable extensions list', () => {
            const extensions = FileUtils.getProcessableExtensions();
            expect(extensions).toContain('.mp3');
            expect(extensions).toContain('.md');
            expect(extensions).toContain('.txt');
            expect(extensions).toHaveLength(6);
        });
    });

    describe('generateTimestamp', () => {
        it('should generate valid ISO timestamp', () => {
            const timestamp = FileUtils.generateTimestamp();
            expect(timestamp).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/);
            expect(new Date(timestamp).toISOString()).toBe(timestamp);
        });
    });

    describe('createProcessingContext', () => {
        it('should create valid processing context', () => {
            const fileInfo: FileInfo = {
                name: 'test.mp3',
                path: 'inbox/audio/tasks/test.mp3',
                size: 1000,
                extension: '.mp3',
                category: 'tasks',
                isProcessable: true,
                lastModified: new Date(),
                mimeType: 'audio/mpeg'
            };

            const context = FileUtils.createProcessingContext(fileInfo, 'transcribe');

            expect(context.category).toBe('tasks');
            expect(context.filename).toBe('test');
            expect(context.stepId).toBe('transcribe');
            expect(context.timestamp).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/);
            expect(context.date).toMatch(/\d{4}-\d{2}-\d{2}/);
        });
    });
});

describe('File Operations Integration', () => {
    let fileOps: FileOperations;

    beforeEach(() => {
        fileOps = new FileOperations(mockApp as any);
    });

    afterEach(() => {
        cleanup();
    });

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