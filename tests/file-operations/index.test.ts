/**
 * File Operations Tests - Main Index
 * 
 * This file imports all the modular file operations tests.
 * Each test suite is now in its own focused file under 4KB.
 */

// Import all test modules to ensure they are executed
import './readFile.test';
import './writeFile.test';
import './ensureDirectory.test';
import './archiveFile.test';
import './discoverFiles.test';
import './fileExistence.test';
import './fileUtils.test';
import './integration.test';

// Re-export setup utilities for other tests that might need them
export * from './setup';
