/**
 * Test for archive conflict resolution - Priority 3 issue
 */

import { FileOperations } from '../../src/core/file-operations';
import { mockApp, mockVault, createMockTFile, createMockTFolder, resetMocks } from './setup';
import { createMockContext, cleanup } from '../setup';

describe('Archive Conflict Resolution', () => {
    let fileOps: FileOperations;

    beforeEach(() => {
        fileOps = new FileOperations(mockApp as any);
        resetMocks();
    });

    afterEach(() => {
        cleanup();
    });

    it('should auto-increment filename when archive destination exists', async () => {
        const sourceFile = createMockTFile('test.md', 'inbox/test.md');
        const existingFile = createMockTFile('test.md', 'inbox/archive/transcribe/test.md');
        const newFile = createMockTFile('test-1.md', 'inbox/archive/transcribe/test-1.md');
        const context = createMockContext({ stepId: 'transcribe' });

        // Mock sequence with proper directory checking:
        // 1. Source file check
        // 2. Directory existence check for archive folder (null = doesn't exist)
        // 3. generateUniqueFilename checks: test.md exists, test-1.md doesn't exist
        // 4. Final archived file
        mockVault.getAbstractFileByPath
            .mockReturnValueOnce(sourceFile)           // Source file exists
            .mockReturnValueOnce(null)                 // Archive directory doesn't exist (for ensureDirectory)
            .mockReturnValueOnce(existingFile)         // test.md exists (conflict in generateUniqueFilename!)
            .mockReturnValueOnce(null)                 // test-1.md doesn't exist (success)
            .mockReturnValueOnce(newFile);             // Final archived file

        const mockFolder = createMockTFolder('transcribe', 'inbox/archive/transcribe');
        mockVault.createFolder.mockResolvedValue(mockFolder);
        mockVault.rename.mockResolvedValue(newFile);

        const result = await fileOps.archiveFile(
            'inbox/test.md',
            'inbox/archive/{stepId}',
            context
        );

        expect(result.success).toBe(true);
        expect(result.archivePath).toBe('inbox/archive/transcribe/test-1.md');
        expect(mockVault.rename).toHaveBeenCalledWith(sourceFile, 'inbox/archive/transcribe/test-1.md');
    });

    it('should handle multiple increments correctly', async () => {
        const sourceFile = createMockTFile('test.md', 'inbox/test.md');
        const existingFile1 = createMockTFile('test.md', 'inbox/archive/transcribe/test.md');
        const existingFile2 = createMockTFile('test-1.md', 'inbox/archive/transcribe/test-1.md');
        const newFile = createMockTFile('test-2.md', 'inbox/archive/transcribe/test-2.md');
        const context = createMockContext({ stepId: 'transcribe' });

        // Mock sequence for multiple conflicts
        // 1. Source file check
        // 2. Directory existence check for archive folder
        // 3. generateUniqueFilename checks: test.md exists, test-1.md exists, test-2.md doesn't exist
        // 4. Final archived file
        mockVault.getAbstractFileByPath
            .mockReturnValueOnce(sourceFile)           // Source file exists
            .mockReturnValueOnce(null)                 // Archive directory doesn't exist (for ensureDirectory)
            .mockReturnValueOnce(existingFile1)        // test.md exists (conflict!)
            .mockReturnValueOnce(existingFile2)        // test-1.md exists (conflict!)
            .mockReturnValueOnce(null)                 // test-2.md doesn't exist (success)
            .mockReturnValueOnce(newFile);             // Final archived file

        const mockFolder = createMockTFolder('transcribe', 'inbox/archive/transcribe');
        mockVault.createFolder.mockResolvedValue(mockFolder);
        mockVault.rename.mockResolvedValue(newFile);

        const result = await fileOps.archiveFile(
            'inbox/test.md',
            'inbox/archive/{stepId}',
            context
        );

        expect(result.success).toBe(true);
        expect(result.archivePath).toBe('inbox/archive/transcribe/test-2.md');
        expect(mockVault.rename).toHaveBeenCalledWith(sourceFile, 'inbox/archive/transcribe/test-2.md');
    });
});
