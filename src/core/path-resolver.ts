/**
 * Path Resolution System for Content Pipeline Plugin
 * 
 * This module handles pattern-based path resolution with variable substitution,
 * ensuring all paths are vault-relative and properly validated.
 */

import { PathContext } from '../types';
import { ErrorFactory } from '../error-handler';
import { validatePath } from '../validation/path';
import { createLogger } from '../logger';

const logger = createLogger('PathResolver');

/**
 * Supported variables for path resolution
 */
const SUPPORTED_PATH_VARIABLES = Object.freeze([
    'filename', 
    'timestamp',
    'date',
    'stepId'
] as const);

type PathVariable = typeof SUPPORTED_PATH_VARIABLES[number];

/**
 * Result of path resolution
 */
interface PathResolutionResult {
    /** The resolved path */
    resolvedPath: string;
    /** Variables that were substituted */
    substitutions: Record<string, string>;
    /** Variables that were missing from context */
    missingVariables: string[];
    /** Whether all required variables were found */
    isComplete: boolean;
}

/**
 * Options for path resolution
 */
interface PathResolutionOptions {
    /** Whether to throw on missing variables (default: false) */
    throwOnMissing?: boolean;
    /** Whether to validate the final path (default: true) */
    validateResult?: boolean;
    /** Fallback values for missing variables */
    fallbacks?: Partial<Record<PathVariable, string>>;
}

/**
 * Generate a file-safe timestamp
 */
function generateFileSafeTimestamp(): string {
    const now = new Date();
    return now.toISOString().replace(/:/g, '-').replace(/\./g, '-');
}

/**
 * Path resolver class for handling pattern-based path resolution
 */
export class PathResolver {
    /**
     * Resolve a path pattern with variable substitution
     */
    static resolvePath(
        pattern: string, 
        context: PathContext, 
        options: PathResolutionOptions = {}
    ): PathResolutionResult {
        const {
            throwOnMissing = false,
            validateResult = true,
            fallbacks = {}
        } = options;

        logger.debug('Resolving path pattern', {
            pattern,
            context,
            options
        });

        // Extract all variables from the pattern
        const variableMatches = pattern.match(/\{([^}]+)\}/g) || [];
        const variables = variableMatches.map(match => match.slice(1, -1));
        
        logger.debug('Found variables in pattern', { variables });

        // Prepare substitution values
        const substitutions: Record<string, string> = {};
        const missingVariables: string[] = [];

        // Generate timestamp and date if needed
        const now = new Date();
        const contextWithDefaults = {
            ...context,
            timestamp: context.timestamp || generateFileSafeTimestamp(),
            date: context.date || now.toISOString().split('T')[0]
        };

        // Process each variable
        for (const variable of variables) {
            if (!SUPPORTED_PATH_VARIABLES.includes(variable as PathVariable)) {
                throw ErrorFactory.validation(
                    `Unsupported variable in path pattern: {${variable}}`,
                    `Path pattern contains unsupported variable: {${variable}}`,
                    { pattern, variable, supportedVariables: SUPPORTED_PATH_VARIABLES },
                    [
                        `Supported variables: ${SUPPORTED_PATH_VARIABLES.join(', ')}`,
                        'Check variable spelling and case',
                        'Remove unsupported variables'
                    ]
                );
            }

            const value = contextWithDefaults[variable as keyof PathContext] || 
                         fallbacks[variable as PathVariable];

            if (value !== undefined) {
                substitutions[variable] = String(value);
            } else {
                missingVariables.push(variable);
                
                if (throwOnMissing) {
                    throw ErrorFactory.validation(
                        `Missing required variable for path resolution: {${variable}}`,
                        `Cannot resolve path pattern: missing value for {${variable}}`,
                        { pattern, variable, context },
                        [
                            `Provide a value for {${variable}}`,
                            'Check your context object',
                            'Use fallback values in options'
                        ]
                    );
                }
            }
        }

        // Perform variable substitution
        let resolvedPath = pattern;
        for (const [variable, value] of Object.entries(substitutions)) {
            const placeholder = `{${variable}}`;
            resolvedPath = resolvedPath.replace(new RegExp(escapeRegExp(placeholder), 'g'), value);
        }

        logger.debug('Path resolution result', {
            original: pattern,
            resolved: resolvedPath,
            substitutions,
            missingVariables
        });

        // Validate the resolved path if requested
        if (validateResult && missingVariables.length === 0) {
            try {
                // Check if the resolved path is a glob pattern (contains *)
                const isGlobPattern = resolvedPath.includes('*');
                validatePath(resolvedPath, 'resolved path', isGlobPattern);
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                throw ErrorFactory.validation(
                    `Invalid resolved path: ${errorMessage}`,
                    'Path resolution resulted in an invalid path',
                    { pattern, resolvedPath, context, originalError: error },
                    [
                        'Check your path pattern',
                        'Verify variable values are valid',
                        'Ensure pattern results in valid path'
                    ]
                );
            }
        }

        const result: PathResolutionResult = {
            resolvedPath,
            substitutions,
            missingVariables,
            isComplete: missingVariables.length === 0
        };

        return result;
    }

    /**
     * Resolve multiple path patterns at once
     */
    static resolveMultiple(
        patterns: string[],
        context: PathContext,
        options: PathResolutionOptions = {}
    ): PathResolutionResult[] {
        logger.debug('Resolving multiple path patterns', {
            patterns: patterns.length,
            context
        });

        return patterns.map(pattern => this.resolvePath(pattern, context, options));
    }

    /**
     * Extract all variables from a path pattern
     */
    static extractVariables(pattern: string): string[] {
        const matches = pattern.match(/\{([^}]+)\}/g) || [];
        return matches.map(match => match.slice(1, -1));
    }

    /**
     * Check if a pattern contains specific variables
     */
    static containsVariables(pattern: string, variables: string[]): boolean {
        const patternVars = this.extractVariables(pattern);
        return variables.every(variable => patternVars.includes(variable));
    }

    /**
     * Check if a pattern is valid (contains only supported variables)
     */
    static isValidPattern(pattern: string): boolean {
        const variables = this.extractVariables(pattern);
        return variables.every(variable => 
            SUPPORTED_PATH_VARIABLES.includes(variable as PathVariable)
        );
    }

    /**
     * Get the required variables for a pattern
     */
    static getRequiredVariables(pattern: string): PathVariable[] {
        const variables = this.extractVariables(pattern);
        return variables.filter(variable => 
            SUPPORTED_PATH_VARIABLES.includes(variable as PathVariable)
        ) as PathVariable[];
    }

    /**
     * Create a context with default values for common scenarios
     */
    static createDefaultContext(overrides: Partial<PathContext> = {}): PathContext {
        const now = new Date();
        
        return {
            timestamp: generateFileSafeTimestamp(),
            date: now.toISOString().split('T')[0],
            ...overrides
        };
    }

    /**
     * Normalize a path by cleaning up separators and ensuring vault-relative format
     */
    static normalizePath(path: string): string {
        if (!path) return '';

        // Convert backslashes to forward slashes
        let normalized = path.replace(/\\/g, '/');

        // Remove leading slashes to ensure vault-relative
        normalized = normalized.replace(/^\/+/, '');

        // Clean up double slashes
        normalized = normalized.replace(/\/+/g, '/');

        // Remove trailing slash unless it's the root
        if (normalized.length > 1 && normalized.endsWith('/')) {
            normalized = normalized.slice(0, -1);
        }

        return normalized;
    }

    /**
     * Join path segments properly
     */
    static joinPaths(...segments: string[]): string {
        const cleanSegments = segments
            .filter(segment => segment && segment.length > 0)
            .map(segment => segment.replace(/^\/+|\/+$/g, '')); // Remove leading/trailing slashes

        return PathResolver.normalizePath(cleanSegments.join('/'));
    }

    /**
     * Get the directory part of a path
     */
    static getDirectory(path: string): string {
        // Input validation: handle null, undefined, or empty paths
        if (!path || typeof path !== 'string') {
            logger.warn('getDirectory received invalid path', { path });
            return '';
        }
        
        const normalized = PathResolver.normalizePath(path);
        const lastSlash = normalized.lastIndexOf('/');
        
        if (lastSlash === -1) {
            return ''; // No directory, file is in root
        }
        
        return normalized.substring(0, lastSlash);
    }

    /**
     * Get the filename part of a path
     */
    static getFilename(path: string): string {
        // Input validation: handle null, undefined, or empty paths
        if (!path || typeof path !== 'string') {
            logger.warn('getFilename received invalid path', { path });
            return '';
        }
        
        const normalized = PathResolver.normalizePath(path);
        
        // If the path ends with a slash, it's a directory
        if (path.endsWith('/')) {
            return '';
        }
        
        const lastSlash = normalized.lastIndexOf('/');
        return lastSlash === -1 ? normalized : normalized.substring(lastSlash + 1);
    }

    /**
     * Get filename without extension
     */
    static getBasename(path: string): string {
        // Input validation: handle null, undefined, or empty paths
        if (!path || typeof path !== 'string') {
            logger.warn('getBasename received invalid path', { path });
            return '';
        }
        
        const filename = PathResolver.getFilename(path);
        const lastDot = filename.lastIndexOf('.');
        
        return lastDot === -1 ? filename : filename.substring(0, lastDot);
    }

    /**
     * Get file extension (including the dot)
     */
    static getExtension(path: string): string {
        // Input validation: handle null, undefined, or empty paths
        if (!path || typeof path !== 'string') {
            logger.warn('getExtension received invalid path', { path });
            return '';
        }
        
        const filename = PathResolver.getFilename(path);
        const lastDot = filename.lastIndexOf('.');
        
        return lastDot === -1 ? '' : filename.substring(lastDot);
    }

    /**
     * Check if a path represents a directory (ends with slash or has no extension)
     */
    static isDirectory(path: string): boolean {
        // Input validation: handle null, undefined, or empty paths
        if (!path || typeof path !== 'string') {
            return false;
        }
        
        const normalized = PathResolver.normalizePath(path);
        return normalized.endsWith('/') || !PathResolver.getExtension(normalized);
    }

    /**
     * Ensure a path represents a directory by adding trailing slash if needed
     */
    static ensureDirectory(path: string): string {
        // Input validation: handle null, undefined, or empty paths
        if (!path || typeof path !== 'string') {
            logger.warn('ensureDirectory received invalid path', { path });
            return '/';
        }
        
        const normalized = PathResolver.normalizePath(path);
        return normalized.endsWith('/') ? normalized : normalized + '/';
    }
}

/**
 * Escape special regex characters
 */
function escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Utility functions for common path operations
 */
export const PathUtils = {
    /**
     * Resolve a single path with error handling
     */
    resolve: (pattern: string, context: PathContext, options?: PathResolutionOptions) => {
        return PathResolver.resolvePath(pattern, context, options);
    },

    /**
     * Safely resolve a path, returning null on error
     */
    safeResolve: (pattern: string, context: PathContext, options?: PathResolutionOptions): string | null => {
        try {
            const result = PathResolver.resolvePath(pattern, context, options);
            return result.isComplete ? result.resolvedPath : null;
        } catch (error) {
            logger.warn('Failed to resolve path pattern', { pattern, context, error });
            return null;
        }
    },

    /**
     * Check if all required variables are present for a pattern
     */
    canResolve: (pattern: string, context: PathContext): boolean => {
        const required = PathResolver.getRequiredVariables(pattern);
        const contextWithDefaults = {
            ...context,
            timestamp: context.timestamp || generateFileSafeTimestamp(),
            date: context.date || new Date().toISOString().split('T')[0]
        };
        
        return required.every(variable => 
            contextWithDefaults[variable as keyof PathContext] !== undefined
        );
    },

    /**
     * Get missing variables for a pattern
     */
    getMissingVariables: (pattern: string, context: PathContext): string[] => {
        const required = PathResolver.getRequiredVariables(pattern);
        const contextWithDefaults = {
            ...context,
            timestamp: context.timestamp || generateFileSafeTimestamp(),
            date: context.date || new Date().toISOString().split('T')[0]
        };
        
        return required.filter(variable => 
            contextWithDefaults[variable as keyof PathContext] === undefined
        );
    },

    // Re-export common path utilities with proper static method calls
    normalize: (path: string) => PathResolver.normalizePath(path),
    join: (...segments: string[]) => PathResolver.joinPaths(...segments),
    getDirectory: (path: string) => PathResolver.getDirectory(path),
    getFilename: (path: string) => PathResolver.getFilename(path),
    getBasename: (path: string) => PathResolver.getBasename(path),
    getExtension: (path: string) => PathResolver.getExtension(path),
    isDirectory: (path: string) => PathResolver.isDirectory(path),
    ensureDirectory: (path: string) => PathResolver.ensureDirectory(path)
};