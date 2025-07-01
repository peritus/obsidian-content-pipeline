/**
 * Directory-Only Configuration Validator
 * 
 * Simplified validation for the new directory-only output system.
 * Replaces complex template variable validation with simple directory path validation.
 */

import { SimplePathBuilder } from '../core/SimplePathBuilder';
import { createLogger } from '../logger';

const logger = createLogger('DirectoryOnlyValidator');

/**
 * Validation result for directory-only configuration
 */
export interface DirectoryValidationResult {
    /** Whether the configuration is valid */
    isValid: boolean;
    /** Validation error messages */
    errors: string[];
    /** Validation warnings */
    warnings: string[];
}

export class DirectoryOnlyValidator {
    /**
     * Validate that an output configuration uses only directory paths
     * 
     * @param stepId - Step ID for error context
     * @param outputConfig - Output configuration to validate (string or object)
     * @returns Validation result
     */
    static validateOutputConfiguration(
        stepId: string, 
        outputConfig: string | Record<string, string>
    ): DirectoryValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!outputConfig) {
            errors.push(`Step "${stepId}": Missing output configuration`);
            return { isValid: false, errors, warnings };
        }

        // Handle string output (single directory path)
        if (typeof outputConfig === 'string') {
            const directoryValidation = this.validateDirectoryPath(outputConfig, `Step "${stepId}" output`);
            errors.push(...directoryValidation.errors);
            warnings.push(...directoryValidation.warnings);
        }
        // Handle routing-aware output (multiple directory paths)
        else if (typeof outputConfig === 'object' && outputConfig !== null) {
            for (const [route, path] of Object.entries(outputConfig)) {
                if (typeof path !== 'string') {
                    errors.push(`Step "${stepId}": Output path for route "${route}" must be a string`);
                    continue;
                }

                const directoryValidation = this.validateDirectoryPath(
                    path, 
                    `Step "${stepId}" output route "${route}"`
                );
                errors.push(...directoryValidation.errors);
                warnings.push(...directoryValidation.warnings);
            }

            // Recommend default fallback if not present
            if (!outputConfig.default) {
                warnings.push(`Step "${stepId}": No default fallback configured - routing failures may cause errors`);
            }
        }
        else {
            errors.push(`Step "${stepId}": Invalid output configuration - must be string or object`);
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Validate that an archive configuration uses only directory paths
     * 
     * @param stepId - Step ID for error context
     * @param archiveConfig - Archive configuration to validate
     * @returns Validation result
     */
    static validateArchiveConfiguration(
        stepId: string, 
        archiveConfig: string
    ): DirectoryValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!archiveConfig) {
            errors.push(`Step "${stepId}": Missing archive configuration`);
            return { isValid: false, errors, warnings };
        }

        if (typeof archiveConfig !== 'string') {
            errors.push(`Step "${stepId}": Archive configuration must be a string`);
            return { isValid: false, errors, warnings };
        }

        const directoryValidation = this.validateDirectoryPath(archiveConfig, `Step "${stepId}" archive`);
        errors.push(...directoryValidation.errors);
        warnings.push(...directoryValidation.warnings);

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Validate that a path is a properly formatted directory path
     * 
     * @param path - Path to validate
     * @param context - Context for error messages
     * @returns Validation result
     */
    static validateDirectoryPath(path: string, context: string): DirectoryValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        try {
            // Use SimplePathBuilder to validate the directory path
            SimplePathBuilder.validateDirectoryPath(path);
            
            logger.debug(`Directory path validation passed`, { path, context });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            errors.push(`${context}: ${errorMessage}`);
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Validate input pattern (still can be a file pattern for discovery)
     * 
     * @param stepId - Step ID for error context
     * @param inputPattern - Input pattern to validate
     * @returns Validation result
     */
    static validateInputPattern(stepId: string, inputPattern: string): DirectoryValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!inputPattern) {
            errors.push(`Step "${stepId}": Missing input pattern`);
            return { isValid: false, errors, warnings };
        }

        if (typeof inputPattern !== 'string') {
            errors.push(`Step "${stepId}": Input pattern must be a string`);
            return { isValid: false, errors, warnings };
        }

        // Input patterns can be files or directories, so we don't enforce directory format
        // Just check for basic path safety
        if (inputPattern.includes('..')) {
            errors.push(`Step "${stepId}": Input pattern cannot contain path traversal (..) - got: ${inputPattern}`);
        }

        if (inputPattern.startsWith('/')) {
            warnings.push(`Step "${stepId}": Input pattern should be vault-relative (no leading /) - got: ${inputPattern}`);
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Validate a complete pipeline step configuration
     * 
     * @param stepId - Step ID for error context
     * @param stepConfig - Complete step configuration
     * @returns Validation result
     */
    static validateStepConfiguration(
        stepId: string, 
        stepConfig: any
    ): DirectoryValidationResult {
        const allErrors: string[] = [];
        const allWarnings: string[] = [];

        // Validate input pattern
        const inputValidation = this.validateInputPattern(stepId, stepConfig.input);
        allErrors.push(...inputValidation.errors);
        allWarnings.push(...inputValidation.warnings);

        // Validate output configuration
        const outputValidation = this.validateOutputConfiguration(stepId, stepConfig.output);
        allErrors.push(...outputValidation.errors);
        allWarnings.push(...outputValidation.warnings);

        // Validate archive configuration
        const archiveValidation = this.validateArchiveConfiguration(stepId, stepConfig.archive);
        allErrors.push(...archiveValidation.errors);
        allWarnings.push(...archiveValidation.warnings);

        // Validate other required fields
        if (!stepConfig.modelConfig) {
            allErrors.push(`Step "${stepId}": Missing modelConfig reference`);
        }

        return {
            isValid: allErrors.length === 0,
            errors: allErrors,
            warnings: allWarnings
        };
    }

    /**
     * Validate entire pipeline configuration
     * 
     * @param pipelineConfig - Complete pipeline configuration
     * @returns Validation result
     */
    static validatePipelineConfiguration(
        pipelineConfig: Record<string, any>
    ): DirectoryValidationResult {
        const allErrors: string[] = [];
        const allWarnings: string[] = [];

        if (!pipelineConfig || typeof pipelineConfig !== 'object') {
            allErrors.push('Pipeline configuration must be an object');
            return { isValid: false, errors: allErrors, warnings: allWarnings };
        }

        // Validate each step
        for (const [stepId, stepConfig] of Object.entries(pipelineConfig)) {
            // Skip description field
            if (stepId === 'description') {
                continue;
            }

            const stepValidation = this.validateStepConfiguration(stepId, stepConfig);
            allErrors.push(...stepValidation.errors);
            allWarnings.push(...stepValidation.warnings);
        }

        // Check for directory path conflicts
        const conflictErrors = this.validateDirectoryPathConflicts(pipelineConfig);
        allErrors.push(...conflictErrors);

        return {
            isValid: allErrors.length === 0,
            errors: allErrors,
            warnings: allWarnings
        };
    }

    /**
     * Check for conflicts where multiple steps use the same directory paths
     * 
     * @param pipelineConfig - Complete pipeline configuration
     * @returns Array of conflict error messages
     */
    static validateDirectoryPathConflicts(pipelineConfig: Record<string, any>): string[] {
        const errors: string[] = [];
        const directoryUsage = new Map<string, string[]>(); // directory -> [stepIds]

        for (const [stepId, stepConfig] of Object.entries(pipelineConfig)) {
            if (stepId === 'description') continue;

            // Collect all directory paths used by this step
            const directories: string[] = [];

            // Add output directories
            if (typeof stepConfig.output === 'string') {
                directories.push(stepConfig.output);
            } else if (typeof stepConfig.output === 'object' && stepConfig.output !== null) {
                directories.push(...Object.values(stepConfig.output));
            }

            // Add archive directory
            if (stepConfig.archive) {
                directories.push(stepConfig.archive);
            }

            // Track usage
            for (const directory of directories) {
                if (!directoryUsage.has(directory)) {
                    directoryUsage.set(directory, []);
                }
                directoryUsage.get(directory)!.push(stepId);
            }
        }

        // Find conflicts
        for (const [directory, stepIds] of directoryUsage) {
            if (stepIds.length > 1) {
                errors.push(`Directory path conflict: "${directory}" used by steps: ${stepIds.join(', ')}`);
            }
        }

        return errors;
    }
}