/**
 * Test setup utilities for file operations tests
 */

import { jest } from '@jest/globals';
import { TFile, TFolder } from 'obsidian';

// Create mock classes that will pass instanceof checks by setting up prototype chain
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
        
        // Set up prototype chain to pass instanceof checks
        Object.setPrototypeOf(this, TFile.prototype);
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
        
        // Set up prototype chain to pass instanceof checks
        Object.setPrototypeOf(this, TFolder.prototype);
    }
}

// Extended mock for Obsidian file system with proper typing
export const mockVault = {
    read: jest.fn() as jest.MockedFunction<(file: any) => Promise<string>>,
    create: jest.fn() as jest.MockedFunction<(path: string, data: string) => Promise<any>>,
    modify: jest.fn() as jest.MockedFunction<(file: any, data: string) => Promise<void>>,
    rename: jest.fn() as jest.MockedFunction<(file: any, newPath: string) => Promise<any>>,
    delete: jest.fn() as jest.MockedFunction<(file: any) => Promise<void>>,
    createFolder: jest.fn() as jest.MockedFunction<(path: string) => Promise<any>>,
    getAbstractFileByPath: jest.fn() as jest.MockedFunction<(path: string) => any>,
    getMarkdownFiles: jest.fn().mockReturnValue([]) as jest.MockedFunction<() => any[]>,
    getFiles: jest.fn().mockReturnValue([]) as jest.MockedFunction<() => any[]>
};

export const mockApp = {
    vault: mockVault
};

// Export mock classes for use in tests
export { MockTFile, MockTFolder };

// Helper functions to create mock instances using the custom classes
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
