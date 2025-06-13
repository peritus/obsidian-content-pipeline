/**
 * Category length validation
 */

import { ErrorFactory } from '../../error-handler';

/**
 * Validate category length is within acceptable bounds (1-50 characters)
 */
export function validateLength(category: string): void {
    const trimmedCategory = category.trim();

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
}
