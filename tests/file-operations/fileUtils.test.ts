/**
 * Tests for FileUtils utility functions
 * Updated without category system
 */

import { FileUtils } from '../../src/core/file-operations';
import { FileInfo } from '../../src/types';
import { cleanup } from '../setup';

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
});
