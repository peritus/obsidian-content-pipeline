/**
 * Test setup utilities for file operations tests
 */

import { jest } from '@jest/globals';
import { TFile, TFolder } from 'obsidian';

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

// Helper functions to create mock instances using the global mocks
export function createMockTFile(name: string, path: string, stat?: { size: number; mtime: number; ctime: number }): any {
    const mockFile = new (TFile as any)(mockVault, path);
    mockFile.name = name;
    mockFile.path = path;
    mockFile.basename = name.includes('.') ? name.substring(0, name.lastIndexOf('.')) : name;
    mockFile.extension = name.includes('.') ? name.substring(name.lastIndexOf('.')) : '';
    mockFile.stat = stat || { size: 1000, mtime: Date.now(), ctime: Date.now() };
    mockFile.parent = null;
    return mockFile;
}

export function createMockTFolder(name: string, path: string, children: any[] = []): any {
    const mockFolder = new (TFolder as any)(mockVault, path);
    mockFolder.name = name;
    mockFolder.path = path;
    mockFolder.children = children;
    mockFolder.parent = null;
    return mockFolder;
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
