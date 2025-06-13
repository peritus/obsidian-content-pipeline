/**
 * Category validation utility
 * 
 * Validates category names according to plugin requirements.
 */

import { validateNotEmpty } from './basic-validation';
import { validateLength } from './length-validation';
import { validateNotReserved } from './reserved-validation';
import { validateCharacters } from './character-validation';
import { validateStartCharacter, validateEndCharacter } from './boundary-validation';
import { validateConsecutiveCharacters } from './consecutive-validation';

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
    // Run all validation checks in sequence
    validateNotEmpty(category);
    validateLength(category);
    validateNotReserved(category);
    validateCharacters(category);
    validateStartCharacter(category);
    validateEndCharacter(category);
    validateConsecutiveCharacters(category);

    return true;
}
