/**
 * Tests for FileOperations.writeFile method
 */

import { FileOperations } from '../../src/core/file-operations';
import { mockApp, mockVault, MockTFile, MockTFolder, resetMocks } from './setup';
import { cleanup } from '../setup';

describe('FileOperations - writeFile', () => {
    let fileOps: FileOperations;

    beforeEach(() => {
        fileOps = new FileOperations(mockApp as any);
        resetMocks();
    });

    afterEach(() => {
        cleanup();
    });

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
