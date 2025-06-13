/**
 * Reserved name validation
 */

import { ErrorFactory } from '../../error-handler';
import { RESERVED_CATEGORY_NAMES } from './reserved-names';

/**
 * Validate that category name is not reserved
 */
export function validateNotReserved(category: string): void {
    const trimmedCategory = category.trim();
    
    if (RESERVED_CATEGORY_NAMES.includes(trimmedCategory.toUpperCase()) || RESERVED_CATEGORY_NAMES.includes(trimmedCategory)) {
        throw ErrorFactory.validation(
            `Reserved category name: ${trimmedCategory} - reserved name not allowed`,
            `"${trimmedCategory}" is a reserved name and cannot be used as a category`,
            { category: trimmedCategory, reservedNames: RESERVED_CATEGORY_NAMES },
            ['Choose a different category name', 'Avoid system reserved names', 'Try adding a prefix or suffix']
        );
    }
}
