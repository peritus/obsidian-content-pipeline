/**
 * Basic category validation checks
 */

import { ErrorFactory } from '../../error-handler';

/**
 * Validate that category is not empty or whitespace
 */
export function validateNotEmpty(category: string): void {
    if (!category || category.trim().length === 0) {
        throw ErrorFactory.validation(
            'Empty category name provided - category cannot be empty - must be at least 1 character',
            'Category name cannot be empty',
            { category },
            ['Provide a category name', 'Use letters, numbers, hyphens, or underscores']
        );
    }
}
