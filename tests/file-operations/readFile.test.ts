/**
 * Tests for FileOperations.readFile method
 */

import { FileOperations } from '../../src/core/file-operations';
import { mockApp, mockVault, MockTFile, MockTFolder, resetMocks } from './setup';
import { cleanup } from '../setup';

describe('FileOperations - readFile', () => {
    let fileOps: FileOperations;

    beforeEach(() => {
        fileOps = new FileOperations(mockApp as any);
        resetMocks();
    });

    afterEach(() => {
        cleanup();
    });

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
