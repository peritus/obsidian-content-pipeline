/**
 * Tests for FileOperations.ensureDirectory method
 */

import { FileOperations } from '../../src/core/file-operations';
import { mockApp, mockVault, createMockTFile, createMockTFolder, resetMocks } from './setup';
import { cleanup } from '../setup';

describe('FileOperations - ensureDirectory', () => {
    let fileOps: FileOperations;

    beforeEach(() => {
        fileOps = new FileOperations(mockApp as any);
        resetMocks();
    });

    afterEach(() => {
        cleanup();
    });

    it('should return existing directory', async () => {
        const mockFolder = createMockTFolder('existing', 'existing');
        mockVault.getAbstractFileByPath.mockReturnValue(mockFolder);

        const result = await fileOps.ensureDirectory('existing');

        expect(result).toBe(mockFolder);
        expect(mockVault.createFolder).not.toHaveBeenCalled();
    });

    it('should create new directory', async () => {
        const mockFolder = createMockTFolder('new', 'new');
        mockVault.getAbstractFileByPath.mockReturnValue(null);
        mockVault.createFolder.mockResolvedValue(mockFolder);

        const result = await fileOps.ensureDirectory('new');

        expect(result).toBe(mockFolder);
        expect(mockVault.createFolder).toHaveBeenCalledWith('new');
    });

    it('should throw error if path exists as file', async () => {
        const mockFile = createMockTFile('file.md', 'file.md');
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
