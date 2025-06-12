/**
 * Category validation utility
 * 
 * Validates category names according to plugin requirements.
 */

import { ErrorFactory } from '../error-handler';

/**
 * Reserved category names that cannot be used (Windows reserved names + common conflicts)
 */
const RESERVED_CATEGORY_NAMES = [
    'CON', 'PRN', 'AUX', 'NUL',
    'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
    'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9',
    '.', '..', 'node_modules', '.git', '.obsidian'
];

/**
 * Validate a category name according to plugin requirements
 * 
 * Requirements:
 * - 1-50 characters in length
 * - Only letters, numbers, hyphens, and underscores
 * - Cannot be a reserved name
 * - Cannot start or end with special characters
 * 
 * @param category - The category name to validate
 * @returns true if valid
 * @throws AudioInboxError if invalid
 */
export function validateCategory(category: string): true {
    // Check if category is empty or only whitespace
    if (!category || category.trim().length === 0) {
        throw ErrorFactory.validation(
            'Empty category name provided - category cannot be empty - must be at least 1 character',
            'Category name cannot be empty',
            { category },
            ['Provide a category name', 'Use letters, numbers, hyphens, or underscores']
        );
    }

    const trimmedCategory = category.trim();

    // Check length limits (1-50 characters as per requirements)
    if (trimmedCategory.length < 1) {
        throw ErrorFactory.validation(
            'Category name too short - must be at least 1 character',
            'Category name must be at least 1 character',
            { category: trimmedCategory, length: trimmedCategory.length },
            ['Use a longer category name', 'Minimum length is 1 character']
        );
    }

    if (trimmedCategory.length > 50) {
        throw ErrorFactory.validation(
            `Category name too long: ${trimmedCategory.length} characters - too long`,
            `Category name is too long (${trimmedCategory.length} characters, max 50)`,
            { category: trimmedCategory, length: trimmedCategory.length },
            ['Use a shorter category name', 'Maximum length is 50 characters']
        );
    }

    // Check for reserved names FIRST (before character validation)
    if (RESERVED_CATEGORY_NAMES.includes(trimmedCategory.toUpperCase()) || RESERVED_CATEGORY_NAMES.includes(trimmedCategory)) {
        throw ErrorFactory.validation(
            `Reserved category name: ${trimmedCategory} - reserved name not allowed`,
            `"${trimmedCategory}" is a reserved name and cannot be used as a category`,
            { category: trimmedCategory, reservedNames: RESERVED_CATEGORY_NAMES },
            ['Choose a different category name', 'Avoid system reserved names', 'Try adding a prefix or suffix']
        );
    }

    // Check allowed characters (letters, numbers, hyphens, underscores only)
    const allowedPattern = /^[a-zA-Z0-9\-_]+$/;
    if (!allowedPattern.test(trimmedCategory)) {
        throw ErrorFactory.validation(
            `Invalid characters in category name: ${trimmedCategory} - can only contain letters, numbers, hyphens, and underscores`,
            'Category name can only contain letters, numbers, hyphens, and underscores',
            { category: trimmedCategory },
            ['Remove special characters', 'Use only: a-z, A-Z, 0-9, -, _', 'No spaces or punctuation allowed']
        );
    }

    // Check that it doesn't start or end with special characters
    if (trimmedCategory.startsWith('-') || trimmedCategory.startsWith('_')) {
        throw ErrorFactory.validation(
            `Category name starts with special character: ${trimmedCategory} - cannot start with hyphen or underscore`,
            'Category name cannot start with a hyphen or underscore',
            { category: trimmedCategory },
            ['Start with a letter or number', 'Remove leading - or _']
        );
    }

    if (trimmedCategory.endsWith('-') || trimmedCategory.endsWith('_')) {
        throw ErrorFactory.validation(
            `Category name ends with special character: ${trimmedCategory} - cannot end with hyphen or underscore`,
            'Category name cannot end with a hyphen or underscore',
            { category: trimmedCategory },
            ['End with a letter or number', 'Remove trailing - or _']
        );
    }

    // Check for consecutive special characters (harder to read/use)
    if (trimmedCategory.includes('--') || trimmedCategory.includes('__') || trimmedCategory.includes('-_') || trimmedCategory.includes('_-')) {
        throw ErrorFactory.validation(
            `Consecutive special characters in category name: ${trimmedCategory} - consecutive special characters not allowed`,
            'Category name cannot have consecutive hyphens or underscores',
            { category: trimmedCategory },
            ['Use single hyphens or underscores', 'Separate special characters with letters or numbers']
        );
    }

    return true;
}