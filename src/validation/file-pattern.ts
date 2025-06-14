/**
 * File pattern validation utility
 * 
 * Validates file patterns with variable substitution support.
 */

import { ErrorFactory } from '../error-handler';

/**
 * Supported variables in file patterns (v1.1)
 */
const SUPPORTED_VARIABLES = [
    'filename', 
    'timestamp',
    'date',
    'stepId'
];

/**
 * Validate a file pattern with variable substitution support
 * 
 * @param pattern - The file pattern to validate (e.g., "inbox/audio/{stepId}/{filename}.md")
 * @returns true if valid
 * @throws AudioInboxError if invalid
 */
export function validateFilePattern(pattern: string): true {
    // Check if pattern is empty or only whitespace
    if (!pattern || pattern.trim().length === 0) {
        throw ErrorFactory.validation(
            'Empty file pattern provided - pattern cannot be empty',
            'File pattern cannot be empty',
            { pattern },
            ['Provide a valid file pattern', 'Use variables like {stepId} and {filename}']
        );
    }

    const trimmedPattern = pattern.trim();

    // Check for dangerous patterns
    if (trimmedPattern.includes('../') || trimmedPattern.includes('..\\')) {
        throw ErrorFactory.validation(
            `Path traversal detected in pattern: ${trimmedPattern} - path traversal not allowed`,
            'File pattern cannot contain parent directory references (..)',
            { pattern: trimmedPattern },
            ['Remove .. references', 'Use relative paths only', 'Avoid path traversal for security']
        );
    }

    // Check for absolute paths
    if (trimmedPattern.startsWith('/') || /^[A-Z]:\\/.test(trimmedPattern)) {
        throw ErrorFactory.validation(
            `Absolute path in pattern: ${trimmedPattern} - pattern must be relative`,
            'File pattern must be relative to vault root',
            { pattern: trimmedPattern },
            ['Use relative paths only', 'Remove leading / or drive letter']
        );
    }

    // Extract and validate variables
    const variableMatches = trimmedPattern.match(/\{([^}]+)\}/g);
    const variables = variableMatches ? variableMatches.map(match => match.slice(1, -1)) : [];

    // Check for invalid variables
    const invalidVariables = variables.filter(variable => !SUPPORTED_VARIABLES.includes(variable));
    if (invalidVariables.length > 0) {
        throw ErrorFactory.validation(
            `Invalid variables in pattern: ${invalidVariables.join(', ')} - Unsupported variables`,
            `Unsupported variables: ${invalidVariables.join(', ')}`,
            { 
                pattern: trimmedPattern, 
                invalidVariables, 
                supportedVariables: SUPPORTED_VARIABLES 
            },
            [
                `Supported variables: ${SUPPORTED_VARIABLES.join(', ')}`,
                'Remove unsupported variables',
                'Check variable spelling and case'
            ]
        );
    }

    // Check for unclosed brackets - more robust approach
    const openBrackets = (trimmedPattern.match(/\{/g) || []).length;
    const closeBrackets = (trimmedPattern.match(/\}/g) || []).length;
    if (openBrackets !== closeBrackets) {
        throw ErrorFactory.validation(
            `Unmatched brackets in pattern: ${trimmedPattern}`,
            'File pattern has unmatched brackets',
            { pattern: trimmedPattern, openBrackets, closeBrackets },
            ['Check that every { has a matching }', 'Remove extra brackets', 'Variables must be properly enclosed']
        );
    }

    // Check for malformed variable syntax - improved regex
    // This checks for patterns like {unclosed, nested{{braces}}, or }invalid{
    const hasUnmatchedOpenBrace = /\{[^}]*$/g.test(trimmedPattern);
    const hasUnmatchedCloseBrace = /^[^{]*\}/g.test(trimmedPattern);
    const hasNestedBraces = /\{[^}]*\{/g.test(trimmedPattern) || /\}[^{]*\}/g.test(trimmedPattern);
    
    if (hasUnmatchedOpenBrace || hasUnmatchedCloseBrace || hasNestedBraces) {
        throw ErrorFactory.validation(
            `Malformed variable syntax in pattern: ${trimmedPattern}`,
            'File pattern has malformed variable syntax',
            { pattern: trimmedPattern },
            ['Check variable brackets { }', 'Each variable should be enclosed in { }', 'Variables should not be nested']
        );
    }

    // Check for empty variables
    if (trimmedPattern.includes('{}')) {
        throw ErrorFactory.validation(
            `Empty variable in pattern: ${trimmedPattern}`,
            'File pattern contains empty variable {}',
            { pattern: trimmedPattern },
            ['Remove empty {} brackets', 'Specify variable names inside brackets']
        );
    }

    // Check for invalid characters in path components
    const invalidChars = ['<', '>', ':', '"', '|', '?', '*'];
    // But exclude the variable syntax from this check
    const patternWithoutVariables = trimmedPattern.replace(/\{[^}]+\}/g, 'VAR');
    const foundInvalidChars = invalidChars.filter(char => patternWithoutVariables.includes(char));
    
    if (foundInvalidChars.length > 0) {
        throw ErrorFactory.validation(
            `Invalid characters in pattern: ${foundInvalidChars.join(', ')} - invalid characters not allowed`,
            `File pattern contains invalid characters: ${foundInvalidChars.join(', ')}`,
            { pattern: trimmedPattern, invalidChars: foundInvalidChars },
            ['Remove invalid characters', 'Use only letters, numbers, hyphens, underscores, slashes, and dots']
        );
    }

    // Check for null bytes
    if (trimmedPattern.includes('\0')) {
        throw ErrorFactory.validation(
            'Null byte detected in pattern',
            'File pattern contains invalid null character',
            { pattern: trimmedPattern },
            ['Remove null characters', 'Check for binary data in pattern']
        );
    }

    // Check pattern length
    if (trimmedPattern.length > 500) {
        throw ErrorFactory.validation(
            `Pattern too long: ${trimmedPattern.length} characters - too long`,
            `File pattern is too long (${trimmedPattern.length} characters, max 500)`,
            { pattern: trimmedPattern, length: trimmedPattern.length },
            ['Shorten the pattern', 'Use shorter folder names', 'Simplify the path structure']
        );
    }

    // Check for double slashes
    if (trimmedPattern.includes('//')) {
        throw ErrorFactory.validation(
            `Double slashes in pattern: ${trimmedPattern} - double slashes not allowed`,
            'File pattern contains double slashes (//)',
            { pattern: trimmedPattern },
            ['Use single forward slashes', 'Remove extra slashes']
        );
    }

    // Specific validation for output patterns that should be files
    if (trimmedPattern.includes('{filename}') && !trimmedPattern.includes('.')) {
        throw ErrorFactory.validation(
            `File pattern with {filename} should include file extension: ${trimmedPattern}`,
            'File patterns using {filename} should specify a file extension',
            { pattern: trimmedPattern },
            ['Add file extension (e.g., .md, .txt)', 'Use directory pattern without {filename} for folder output']
        );
    }

    return true;
}