/**
 * Obsidian mock for Jest tests
 * 
 * This file provides mock implementations of Obsidian API classes and functions
 * that are commonly used in plugin development.
 */

// Mock implementations
export class Plugin {
    app: any;
    manifest: any;

    constructor() {
        this.app = mockApp;
        this.manifest = {
            id: 'obsidian-audio-inbox',
            name: 'Audio Inbox',
            version: '1.0.0'
        };
    }

    loadData = jest.fn().mockResolvedValue({});
    saveData = jest.fn().mockResolvedValue(undefined);
    addRibbonIcon = jest.fn();
    addSettingTab = jest.fn();
    onload = jest.fn();
    onunload = jest.fn();
}

// Export Notice as a Jest mock function so tests can use .mockImplementationOnce() etc.
export const Notice = jest.fn().mockImplementation((message: string, timeout?: number) => {
    return {};
});

export class Setting {
    setName = jest.fn().mockReturnThis();
    setDesc = jest.fn().mockReturnThis();
    addToggle = jest.fn().mockReturnThis();
    addText = jest.fn().mockReturnThis();
    addTextArea = jest.fn().mockReturnThis();
    addButton = jest.fn().mockReturnThis();
    addDropdown = jest.fn().mockReturnThis();
    onChange = jest.fn().mockReturnThis();
    onClick = jest.fn().mockReturnThis();
}

export class PluginSettingTab {
    plugin: Plugin;
    app: any;
    
    constructor(app: any, plugin: Plugin) {
        this.app = app;
        this.plugin = plugin;
    }
    
    display = jest.fn();
    hide = jest.fn();
}

export class Component {
    load = jest.fn();
    unload = jest.fn();
    onload = jest.fn();
    onunload = jest.fn();
    addChild = jest.fn();
    removeChild = jest.fn();
}

// Mock App and related objects
const mockVault = {
    adapter: {
        exists: jest.fn().mockResolvedValue(true),
        read: jest.fn().mockResolvedValue(''),
        write: jest.fn().mockResolvedValue(undefined),
        mkdir: jest.fn().mockResolvedValue(undefined),
        stat: jest.fn().mockResolvedValue({ type: 'file', size: 100, mtime: Date.now(), ctime: Date.now() })
    },
    getName: jest.fn().mockReturnValue('Test Vault'),
    getAbstractFileByPath: jest.fn(),
    create: jest.fn(),
    createFolder: jest.fn(),
    delete: jest.fn(),
    rename: jest.fn(),
    modify: jest.fn(),
    read: jest.fn().mockResolvedValue(''),
    cachedRead: jest.fn().mockResolvedValue(''),
    getRoot: jest.fn(),
    getAllLoadedFiles: jest.fn().mockReturnValue([]),
    getFiles: jest.fn().mockReturnValue([]),
    getFolders: jest.fn().mockReturnValue([])
};

const mockWorkspace = {
    getActiveFile: jest.fn(),
    openLinkText: jest.fn(),
    getLeaf: jest.fn(),
    splitActiveLeaf: jest.fn(),
    duplicateLeaf: jest.fn(),
    getRightLeaf: jest.fn(),
    getLeftLeaf: jest.fn(),
    createLeafBySplit: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    trigger: jest.fn()
};

const mockMetadataCache = {
    getFileCache: jest.fn(),
    getCache: jest.fn(),
    getCachedFiles: jest.fn().mockReturnValue([]),
    on: jest.fn(),
    off: jest.fn(),
    trigger: jest.fn()
};

export const mockApp = {
    vault: mockVault,
    workspace: mockWorkspace,
    metadataCache: mockMetadataCache,
    setting: {
        openTabById: jest.fn(),
        openTab: jest.fn(),
        close: jest.fn()
    },
    plugins: {
        plugins: {},
        enablePlugin: jest.fn(),
        disablePlugin: jest.fn(),
        getPlugin: jest.fn()
    },
    loadProgress: {
        isComplete: true
    }
};

// Additional utility exports for tests
export const TFile = jest.fn().mockImplementation((vault: any, path: string) => ({
    vault,
    path,
    name: path.split('/').pop(),
    basename: path.split('/').pop()?.replace(/\.[^/.]+$/, ''),
    extension: path.split('.').pop(),
    stat: { mtime: Date.now(), ctime: Date.now(), size: 100 },
    parent: null
}));

export const TFolder = jest.fn().mockImplementation((vault: any, path: string) => ({
    vault,
    path,
    name: path.split('/').pop(),
    children: [],
    parent: null,
    isRoot: jest.fn().mockReturnValue(path === '')
}));

export const normalizePath = jest.fn().mockImplementation((path: string) => {
    return path.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/\/$/, '') || '/';
});

export const moment = jest.fn().mockImplementation((date?: any) => ({
    format: jest.fn().mockReturnValue('2024-01-15T10:30:00Z'),
    valueOf: jest.fn().mockReturnValue(1705316600000),
    toDate: jest.fn().mockReturnValue(new Date('2024-01-15T10:30:00Z')),
    isValid: jest.fn().mockReturnValue(true),
    add: jest.fn().mockReturnThis(),
    subtract: jest.fn().mockReturnThis()
}));

// Export additional test helpers
export { mockVault, mockWorkspace, mockMetadataCache };