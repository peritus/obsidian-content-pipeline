/**
 * Path validation utility
 * 
 * Validates file paths for vault-relative safety and proper formatting.
 */

import { ErrorFactory } from '../error-handler';

/**
 * Validate a file path for vault safety and proper formatting
 * 
 * @param path - The path to validate
 * @param context - Context for error reporting (e.g., "template path", "input directory")
 * @param allowGlobs - Whether to allow glob patterns (* characters) - defaults to false
 * @returns true if valid
 * @throws AudioInboxError if invalid
 */
export function validatePath(path: string, context: string, allowGlobs: boolean = false): true {
    // Check if path is empty or only whitespace
    if (!path || path.trim().length === 0) {
        throw ErrorFactory.validation(
            `Empty path provided for ${context} - ${context} cannot be empty`,
            `${context} cannot be empty`,
            { path, context },
            ['Provide a valid file path', 'Check your configuration']
        );
    }

    const trimmedPath = path.trim();

    // Check for absolute paths (security concern)
    if (trimmedPath.startsWith('/') || /^[A-Z]:\\/.test(trimmedPath)) {
        throw ErrorFactory.validation(
            `Absolute path not allowed: ${trimmedPath} - ${context} must be relative to vault root`,
            `${context} must be relative to vault root`,
            { path: trimmedPath, context },
            ['Use relative paths only', 'Remove leading / or drive letter', 'Paths should be relative to vault root']
        );
    }

    // Check for dangerous path traversal
    if (trimmedPath.includes('../') || trimmedPath.includes('..\\')) {
        throw ErrorFactory.validation(
            `Path traversal detected in ${context}: ${trimmedPath} - path traversal not allowed`,
            `${context} cannot contain parent directory references (..)`,
            { path: trimmedPath, context },
            ['Remove .. references', 'Use vault-relative paths only', 'Avoid path traversal for security']
        );
    }

    // Check for invalid characters (basic check for common problematic chars)
    let invalidChars = ['<', '>', ':', '"', '|', '?'];
    
    // Only include * as invalid if globs are not allowed
    if (!allowGlobs) {
        invalidChars.push('*');
    }
    
    const foundInvalidChars = invalidChars.filter(char => trimmedPath.includes(char));
    
    if (foundInvalidChars.length > 0) {
        throw ErrorFactory.validation(
            `Invalid characters in ${context}: ${foundInvalidChars.join(', ')} - invalid characters not allowed`,
            `${context} contains invalid characters: ${foundInvalidChars.join(', ')}`,
            { path: trimmedPath, context, invalidChars: foundInvalidChars },
            ['Remove invalid characters', 'Use only letters, numbers, hyphens, underscores, and forward slashes']
        );
    }

    // Check for null bytes (security)
    if (trimmedPath.includes('\0')) {
        throw ErrorFactory.validation(
            `Null byte detected in ${context} - null character not allowed`,
            `${context} contains invalid null character`,
            { path: trimmedPath, context },
            ['Remove null characters', 'Check for binary data in path']
        );
    }

    // Check path length (reasonable limit)
    if (trimmedPath.length > 260) {
        throw ErrorFactory.validation(
            `Path too long for ${context}: ${trimmedPath.length} characters - path is too long`,
            `${context} is too long (${trimmedPath.length} characters, max 260)`,
            { path: trimmedPath, context, length: trimmedPath.length },
            ['Shorten the path', 'Use shorter folder and file names', 'Reorganize folder structure']
        );
    }

    // Check for double slashes (can cause issues)
    if (trimmedPath.includes('//')) {
        throw ErrorFactory.validation(
            `Double slashes found in ${context}: ${trimmedPath} - double slashes not allowed`,
            `${context} contains double slashes (//)`,
            { path: trimmedPath, context },
            ['Remove double slashes', 'Use single forward slashes as separators']
        );
    }

    // Check for trailing slash on what should be a file path
    if (context.toLowerCase().includes('file') && trimmedPath.endsWith('/')) {
        throw ErrorFactory.validation(
            `File path ends with slash: ${trimmedPath}`,
            `${context} should not end with a slash`,
            { path: trimmedPath, context },
            ['Remove trailing slash', 'File paths should not end with /']
        );
    }

    return true;
}