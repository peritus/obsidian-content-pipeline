/**
 * Test setup utilities for file operations tests
 */

import { jest } from '@jest/globals';

// Create mock classes that will work with instanceof checks
class MockTFile {
    public name: string;
    public path: string;
    public basename: string;
    public extension: string;
    public stat: { size: number; mtime: number; ctime: number };
    public vault: any;
    public parent: any;

    constructor(vault: any, path: string, name?: string, stat?: { size: number; mtime: number; ctime: number }) {
        this.vault = vault;
        this.path = path;
        this.name = name || path.split('/').pop() || '';
        this.basename = this.name.includes('.') ? this.name.substring(0, this.name.lastIndexOf('.')) : this.name;
        this.extension = this.name.includes('.') ? this.name.substring(this.name.lastIndexOf('.')) : '';
        this.stat = stat || { size: 1000, mtime: Date.now(), ctime: Date.now() };
        this.parent = null;
    }
}

class MockTFolder {
    public name: string;
    public path: string;
    public children: any[];
    public vault: any;
    public parent: any;

    constructor(vault: any, path: string, name?: string, children: any[] = []) {
        this.vault = vault;
        this.path = path;
        this.name = name || path.split('/').pop() || '';
        this.children = children;
        this.parent = null;
    }
}

// Mock the obsidian module to use our mock classes
jest.mock('obsidian', () => ({
    normalizePath: jest.fn((path: string) => path),
    TFile: MockTFile,
    TFolder: MockTFolder
}));

// Extended mock for Obsidian file system
export const mockVault = {
    read: jest.fn<any, any>(),
    create: jest.fn<any, any>(),
    modify: jest.fn<any, any>(),
    rename: jest.fn<any, any>(),
    delete: jest.fn<any, any>(),
    createFolder: jest.fn<any, any>(),
    getAbstractFileByPath: jest.fn<any, any>(),
    getMarkdownFiles: jest.fn<any, any>().mockReturnValue([]),
    getFiles: jest.fn<any, any>().mockReturnValue([])
};

export const mockApp = {
    vault: mockVault
};

// Export mock classes for use in tests
export { MockTFile, MockTFolder };

// Helper functions to create mock instances
export function createMockTFile(name: string, path: string, stat?: { size: number; mtime: number; ctime: number }): MockTFile {
    return new MockTFile(mockVault, path, name, stat);
}

export function createMockTFolder(name: string, path: string, children: any[] = []): MockTFolder {
    return new MockTFolder(mockVault, path, name, children);
}

/**
 * Reset all mocks to clean state
 */
export function resetMocks(): void {
    Object.values(mockVault).forEach(mock => {
        if (jest.isMockFunction(mock)) {
            mock.mockReset();
        }
    });
}
