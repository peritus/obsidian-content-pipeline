/**
 * Start and end character validation
 */

import { ErrorFactory } from '../../error-handler';

/**
 * Validate that category does not start with special characters
 */
export function validateStartCharacter(category: string): void {
    const trimmedCategory = category.trim();
    
    if (trimmedCategory.startsWith('-') || trimmedCategory.startsWith('_')) {
        throw ErrorFactory.validation(
            `Category name starts with special character: ${trimmedCategory} - cannot start with hyphen or underscore`,
            'Category name cannot start with a hyphen or underscore',
            { category: trimmedCategory },
            ['Start with a letter or number', 'Remove leading - or _']
        );
    }
}

/**
 * Validate that category does not end with special characters
 */
export function validateEndCharacter(category: string): void {
    const trimmedCategory = category.trim();
    
    if (trimmedCategory.endsWith('-') || trimmedCategory.endsWith('_')) {
        throw ErrorFactory.validation(
            `Category name ends with special character: ${trimmedCategory} - cannot end with hyphen or underscore`,
            'Category name cannot end with a hyphen or underscore',
            { category: trimmedCategory },
            ['End with a letter or number', 'Remove trailing - or _']
        );
    }
}
