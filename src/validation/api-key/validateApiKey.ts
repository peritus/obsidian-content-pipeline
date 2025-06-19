/**
 * API key validation utility
 * 
 * Validates API keys for various providers (OpenAI, Anthropic, etc.).
 */

import { validateNotEmpty, validateNoWhitespace, validateNoQuotes } from './basic-validation';
import { validateNotPlaceholder } from './placeholder-detection';
import { validateLength } from './length-validation';
import { validateFormat } from './format-validation';

/**
 * Validate an API key format
 * 
 * @param apiKey - The API key to validate
 * @returns true if valid
 * @throws ContentPipelineError if invalid
 */
export function validateApiKey(apiKey: string): true {
    // Run all validation checks in sequence
    validateNotEmpty(apiKey);
    validateNoWhitespace(apiKey);
    validateNoQuotes(apiKey);
    validateNotPlaceholder(apiKey);
    validateLength(apiKey);
    validateFormat(apiKey);

    return true;
}
