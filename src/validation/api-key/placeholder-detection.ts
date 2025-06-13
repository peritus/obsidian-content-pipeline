/**
 * Placeholder API key detection
 */

import { ErrorFactory } from '../../error-handler';

/**
 * Validate that API key is not a placeholder
 */
export function validateNotPlaceholder(apiKey: string): void {
    const trimmedKey = apiKey.trim();
    
    if (trimmedKey.toLowerCase().includes('your_api_key') || trimmedKey.toLowerCase().includes('sk-your-key')) {
        throw ErrorFactory.validation(
            'Placeholder API key detected - placeholder not allowed',
            'Please replace the placeholder with your actual API key',
            { apiKey: '***REDACTED***', isPlaceholder: true },
            ['Get your real API key from the provider', 'Replace the placeholder text', 'Check the documentation for setup instructions']
        );
    }
}
