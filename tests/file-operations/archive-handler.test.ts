/**
 * Test for end-to-end archive behavior including source metadata
 */

import { ArchiveHandler } from '../../src/core/pipeline-executor/StepChain/ArchiveHandler';
import { mockApp, mockVault, createMockTFile, createMockTFolder, resetMocks } from './setup';
import { cleanup } from '../setup';

describe('ArchiveHandler with Conflict Resolution', () => {
    let archiveHandler: ArchiveHandler;

    beforeEach(() => {
        archiveHandler = new ArchiveHandler(mockApp as any);
        resetMocks();
    });

    afterEach(() => {
        cleanup();
    });

    it('should return correct archive path when conflicts occur', async () => {
        const fileInfo = { 
            path: 'inbox/test.md', 
            name: 'test.md',
            extension: '.md',
            size: 1000,
            lastModified: new Date(),
            isProcessable: true
        };

        const step = {
            modelConfig: 'openai-gpt',
            input: 'inbox/transcripts',
            output: 'inbox/output',
            archive: 'inbox/archive/{stepId}',
            include: [],
            description: 'Test step for archive handler'
        };

        const stepId = 'transcribe';

        // Mock the file operations for conflict scenario
        const sourceFile = createMockTFile('test.md', 'inbox/test.md');
        const existingFile = createMockTFile('test.md', 'inbox/archive/transcribe/test.md');
        const newFile = createMockTFile('test-1.md', 'inbox/archive/transcribe/test-1.md');

        mockVault.getAbstractFileByPath
            .mockReturnValueOnce(sourceFile)           // Source file exists
            .mockReturnValueOnce(null)                 // Archive directory doesn't exist
            .mockReturnValueOnce(existingFile)         // test.md exists (conflict!)
            .mockReturnValueOnce(null)                 // test-1.md doesn't exist
            .mockReturnValueOnce(newFile);             // Final archived file

        const mockFolder = createMockTFolder('transcribe', 'inbox/archive/transcribe');
        mockVault.createFolder.mockResolvedValue(mockFolder);
        mockVault.rename.mockResolvedValue(newFile);

        const result = await archiveHandler.archive(fileInfo, step, stepId);

        // Should return the actual archive path with incremented filename
        expect(result).toBe('inbox/archive/transcribe/test-1.md');
        
        // Verify the rename was called with the correct paths
        expect(mockVault.rename).toHaveBeenCalledWith(sourceFile, 'inbox/archive/transcribe/test-1.md');
    });

    it('should return original path when archiving fails', async () => {
        const fileInfo = { 
            path: 'inbox/test.md', 
            name: 'test.md',
            extension: '.md',
            size: 1000,
            lastModified: new Date(),
            isProcessable: true
        };

        const step = {
            modelConfig: 'openai-gpt',
            input: 'inbox/transcripts',
            output: 'inbox/output',
            archive: 'inbox/archive/{stepId}',
            include: [],
            description: 'Test step for archive handler'
        };

        const stepId = 'transcribe';

        // Mock failure scenario - source file not found
        mockVault.getAbstractFileByPath.mockReturnValue(null);

        const result = await archiveHandler.archive(fileInfo, step, stepId);

        // Should return original path when archiving fails
        expect(result).toBe('inbox/test.md');
    });
});
