/**
 * API key length validation
 */

import { ErrorFactory } from '../../error-handler';

/**
 * Validate API key length is within acceptable bounds
 */
export function validateLength(apiKey: string): void {
    const trimmedKey = apiKey.trim();
    
    if (trimmedKey.length < 8) {
        throw ErrorFactory.validation(
            `API key too short: ${trimmedKey.length} characters`,
            'API key is too short (minimum 8 characters)',
            { apiKey: '***REDACTED***', length: trimmedKey.length },
            ['Check if you copied the complete API key', 'Get a new API key from your provider']
        );
    }

    if (trimmedKey.length > 200) {
        throw ErrorFactory.validation(
            `API key too long: ${trimmedKey.length} characters`,
            'API key is too long (maximum 200 characters)',
            { apiKey: '***REDACTED***', length: trimmedKey.length },
            ['Check if you copied extra characters', 'Verify the API key format']
        );
    }
}
