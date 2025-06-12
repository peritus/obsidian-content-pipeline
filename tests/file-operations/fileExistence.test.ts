/**
 * Tests for FileOperations file existence checks and deletion
 */

import { FileOperations } from '../../src/core/file-operations';
import { mockApp, mockVault, MockTFile, MockTFolder, resetMocks } from './setup';
import { cleanup } from '../setup';

describe('FileOperations - File Existence and Deletion', () => {
    let fileOps: FileOperations;

    beforeEach(() => {
        fileOps = new FileOperations(mockApp as any);
        resetMocks();
    });

    afterEach(() => {
        cleanup();
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
