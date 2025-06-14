/**
 * Tests for FileOperations.archiveFile method
 * Updated for v1.1 schema - no category system, step-based archiving
 */

import { FileOperations } from '../../src/core/file-operations';
import { mockApp, mockVault, createMockTFile, createMockTFolder, resetMocks } from './setup';
import { createMockContext, cleanup } from '../setup';

describe('FileOperations - archiveFile', () => {
    let fileOps: FileOperations;

    beforeEach(() => {
        fileOps = new FileOperations(mockApp as any);
        resetMocks();
    });

    afterEach(() => {
        cleanup();
    });

    it('should archive file successfully', async () => {
        const sourceFile = createMockTFile('source.md', 'inbox/source.md');
        const archivedFile = createMockTFile('source.md', 'inbox/archive/transcribe/source.md');
        const context = createMockContext({ stepId: 'transcribe' });

        mockVault.getAbstractFileByPath
            .mockReturnValueOnce(sourceFile) // Source file exists
            .mockReturnValueOnce(null) // Archive directory doesn't exist
            .mockReturnValueOnce(null) // Archive file doesn't exist
            .mockReturnValueOnce(archivedFile); // Final archived file

        const mockFolder = createMockTFolder('archive', 'inbox/archive/transcribe');
        mockVault.createFolder.mockResolvedValue(mockFolder);
        mockVault.rename.mockResolvedValue(archivedFile);

        const result = await fileOps.archiveFile(
            'inbox/source.md',
            'inbox/archive/{stepId}',
            context
        );

        expect(result.success).toBe(true);
        expect(result.originalPath).toBe('inbox/source.md');
        expect(result.archivedFile).toBe(archivedFile);
    });

    it('should fail if source file not found', async () => {
        mockVault.getAbstractFileByPath.mockReturnValue(null);
        const context = createMockContext({ stepId: 'transcribe' });

        await expect(fileOps.archiveFile(
            'nonexistent.md',
            'inbox/archive/{stepId}',
            context
        )).rejects.toThrow('Source file not found');
    });

    it('should handle incomplete archive path resolution', async () => {
        const sourceFile = createMockTFile('source.md', 'source.md');
        mockVault.getAbstractFileByPath.mockReturnValue(sourceFile);

        const incompleteContext = {}; // Missing required stepId variable

        await expect(fileOps.archiveFile(
            'source.md',
            'inbox/archive/{stepId}',
            incompleteContext
        )).rejects.toThrow('Cannot resolve archive path');
    });
});
