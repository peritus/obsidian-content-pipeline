/**
 * Consecutive character validation
 */

import { ErrorFactory } from '../../error-handler';

/**
 * Validate that category does not have consecutive special characters
 */
export function validateConsecutiveCharacters(category: string): void {
    const trimmedCategory = category.trim();
    
    // Check for consecutive special characters (harder to read/use)
    if (trimmedCategory.includes('--') || trimmedCategory.includes('__') || trimmedCategory.includes('-_') || trimmedCategory.includes('_-')) {
        throw ErrorFactory.validation(
            `Consecutive special characters in category name: ${trimmedCategory} - consecutive special characters not allowed`,
            'Category name cannot have consecutive hyphens or underscores',
            { category: trimmedCategory },
            ['Use single hyphens or underscores', 'Separate special characters with letters or numbers']
        );
    }
}
