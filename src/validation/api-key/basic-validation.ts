/**
 * Basic API key validation checks
 */

import { ErrorFactory } from '../../error-handler';

/**
 * Validate that API key is not empty
 */
export function validateNotEmpty(apiKey: string): void {
    if (!apiKey || apiKey.trim().length === 0) {
        throw ErrorFactory.validation(
            'Empty API key provided - API key cannot be empty',
            'API key cannot be empty',
            { apiKeyLength: apiKey?.length || 0 },
            ['Provide a valid API key', 'Get API key from your provider', 'Check your configuration']
        );
    }
}

/**
 * Validate that API key doesn't contain whitespace
 */
export function validateNoWhitespace(apiKey: string): void {
    const trimmedKey = apiKey.trim();
    
    if (trimmedKey !== apiKey || trimmedKey.includes(' ')) {
        throw ErrorFactory.validation(
            'API key contains whitespace - API key cannot contain spaces',
            'API key cannot contain spaces or whitespace',
            { apiKey: '***REDACTED***', hasWhitespace: true },
            ['Remove spaces from API key', 'Copy API key exactly as provided', 'Check for leading/trailing spaces']
        );
    }
}

/**
 * Validate that API key doesn't contain quotes
 */
export function validateNoQuotes(apiKey: string): void {
    const trimmedKey = apiKey.trim();
    
    if (trimmedKey.includes('"') || trimmedKey.includes("'")) {
        throw ErrorFactory.validation(
            'API key contains quotes - should not include quotation marks',
            'API key should not include quotation marks',
            { apiKey: '***REDACTED***', hasQuotes: true },
            ['Remove quotes from API key', 'Copy just the key without surrounding quotes']
        );
    }
}
