/**
 * Test setup utilities for file operations tests
 */

import { jest } from '@jest/globals';

// Mock normalizePath and use factory functions for TFile and TFolder
jest.mock('obsidian', () => ({
    ...jest.requireActual('obsidian'),
    normalizePath: jest.fn((path: string) => path),
    TFile: jest.fn(),
    TFolder: jest.fn()
}));

// Extended mock for Obsidian file system
export const mockVault = {
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

export const mockApp = {
    vault: mockVault
};

// Mock TFile and TFolder with all required properties
export class MockTFile {
    public basename: string;
    public extension: string;
    public vault: any;
    public parent: any;

    constructor(
        public name: string,
        public path: string,
        public stat: { size: number; mtime: number; ctime: number } = {
            size: 1000,
            mtime: Date.now(),
            ctime: Date.now()
        }
    ) {
        // Extract basename (filename without extension)
        this.basename = name.includes('.') ? name.substring(0, name.lastIndexOf('.')) : name;
        
        // Extract extension
        this.extension = name.includes('.') ? name.substring(name.lastIndexOf('.')) : '';
        
        // Set vault reference
        this.vault = mockVault;
        
        // Set parent (simplified - just null for now)
        this.parent = null;
    }
}

export class MockTFolder {
    public vault: any;
    public parent: any;

    constructor(
        public name: string,
        public path: string,
        public children: (MockTFile | MockTFolder)[] = []
    ) {
        this.vault = mockVault;
        this.parent = null;
    }
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
