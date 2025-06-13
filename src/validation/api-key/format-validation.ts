/**
 * API key format validation
 */

import { ErrorFactory } from '../../error-handler';
import { API_KEY_PATTERNS } from './api-key-patterns';

/**
 * Validate API key format against known patterns
 */
export function validateFormat(apiKey: string): void {
    const trimmedKey = apiKey.trim();
    
    let isValidFormat = false;
    let detectedProvider = 'unknown';

    // Explicitly reject legacy OpenAI format (sk- followed by exactly 48 alphanumeric characters)
    const legacyOpenAIPattern = /^sk-[a-zA-Z0-9]{48}$/;
    if (legacyOpenAIPattern.test(trimmedKey)) {
        throw ErrorFactory.validation(
            'Legacy OpenAI API key format not supported',
            'This appears to be a legacy OpenAI API key format. Please use a project API key instead.',
            { 
                apiKey: '***REDACTED***', 
                length: trimmedKey.length,
                startsWithSk: trimmedKey.startsWith('sk-'),
                detectedProvider: 'OpenAI (legacy)'
            },
            [
                'Create a new project API key from the OpenAI dashboard',
                'Project keys start with "sk-proj-"',
                'Legacy keys starting with "sk-" followed by 48 characters are no longer supported'
            ]
        );
    }

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
    // Check generic format for other providers - make this more strict to fail "invalid-key"
    else if (API_KEY_PATTERNS.generic.test(trimmedKey) && trimmedKey.length >= 12) {
        isValidFormat = true;
        detectedProvider = 'Generic';
    }

    // If no pattern matches, it's likely invalid
    if (!isValidFormat) {
        throw ErrorFactory.validation(
            'Invalid API key format - format is not recognized',
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
                'OpenAI keys start with "sk-proj-"',
                'Anthropic keys start with "sk-ant-api03-"',
                'Remove any quotes or extra characters'
            ]
        );
    }
}
