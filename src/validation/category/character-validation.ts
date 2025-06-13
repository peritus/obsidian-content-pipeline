/**
 * Character pattern validation
 */

import { ErrorFactory } from '../../error-handler';

/**
 * Validate that category contains only allowed characters
 */
export function validateCharacters(category: string): void {
    const trimmedCategory = category.trim();
    
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
}
