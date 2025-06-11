/**
 * API key validation utility
 * 
 * Validates API keys for various providers (OpenAI, Anthropic, etc.).
 */

import { ErrorFactory } from '../error-handler';

/**
 * API key patterns for different providers
 */
const API_KEY_PATTERNS = {
    openai: /^sk-[a-zA-Z0-9]{48}$|^sk-proj-[a-zA-Z0-9]{64}$/,
    anthropic: /^sk-ant-api03-[a-zA-Z0-9\-_]{95}$/,
    // Generic pattern for unknown providers (reasonable length and format)
    generic: /^[a-zA-Z0-9\-_]{8,128}$/
};

/**
 * Validate an API key format
 * 
 * @param apiKey - The API key to validate
 * @returns true if valid
 * @throws AudioInboxError if invalid
 */
export function validateApiKey(apiKey: string): true {
    // Check if API key is empty or only whitespace
    if (!apiKey || apiKey.trim().length === 0) {
        throw ErrorFactory.validation(
            'Empty API key provided',
            'API key cannot be empty',
            { apiKeyLength: apiKey?.length || 0 },
            ['Provide a valid API key', 'Get API key from your provider', 'Check your configuration']
        );
    }

    const trimmedKey = apiKey.trim();

    // Check for whitespace in API key (usually not allowed)
    if (trimmedKey !== apiKey || trimmedKey.includes(' ')) {
        throw ErrorFactory.validation(
            'API key contains whitespace',
            'API key cannot contain spaces or whitespace',
            { apiKey: '***REDACTED***', hasWhitespace: true },
            ['Remove spaces from API key', 'Copy API key exactly as provided', 'Check for leading/trailing spaces']
        );
    }

    // Check length limits (very basic)
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

    // Determine API provider based on key format
    let isValidFormat = false;
    let detectedProvider = 'unknown';

    // Check OpenAI format
    if (API_KEY_PATTERNS.openai.test(trimmedKey)) {
        isValidFormat = true;
        detectedProvider = 'OpenAI';
    }
    // Check Anthropic format
    else if (API_KEY_PATTERNS.anthropic.test(trimmedKey)) {
        isValidFormat = true;
        detectedProvider = 'Anthropic';
    }
    // Check generic format for other providers
    else if (API_KEY_PATTERNS.generic.test(trimmedKey)) {
        isValidFormat = true;
        detectedProvider = 'Generic';
    }

    // If no pattern matches, it's likely invalid
    if (!isValidFormat) {
        throw ErrorFactory.validation(
            'Invalid API key format',
            'API key format is not recognized or contains invalid characters',
            { 
                apiKey: '***REDACTED***', 
                length: trimmedKey.length,
                startsWithSk: trimmedKey.startsWith('sk-'),
                detectedProvider
            },
            [
                'Verify the API key was copied correctly',
                'Check if the API key is from a supported provider',
                'OpenAI keys start with "sk-"',
                'Anthropic keys start with "sk-ant-api03-"',
                'Remove any quotes or extra characters'
            ]
        );
    }

    // Check for common mistakes
    if (trimmedKey.includes('"') || trimmedKey.includes("'")) {
        throw ErrorFactory.validation(
            'API key contains quotes',
            'API key should not include quotation marks',
            { apiKey: '***REDACTED***', hasQuotes: true },
            ['Remove quotes from API key', 'Copy just the key without surrounding quotes']
        );
    }

    if (trimmedKey.toLowerCase().includes('your_api_key') || trimmedKey.toLowerCase().includes('sk-your-key')) {
        throw ErrorFactory.validation(
            'Placeholder API key detected',
            'Please replace the placeholder with your actual API key',
            { apiKey: '***REDACTED***', isPlaceholder: true },
            ['Get your real API key from the provider', 'Replace the placeholder text', 'Check the documentation for setup instructions']
        );
    }

    return true;
}
