/**
 * API key patterns for different providers
 */

/**
 * API key patterns for different providers
 */
export const API_KEY_PATTERNS = {
    openai: /^sk-proj-[a-zA-Z0-9\-_.]{60,}$/,
    anthropic: /^sk-ant-api03-[a-zA-Z0-9\-_]{95}$/,
    // Generic pattern for unknown providers (reasonable length and format)
    generic: /^[a-zA-Z0-9\-_]{8,128}$/
};
