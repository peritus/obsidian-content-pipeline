/**
 * Validation Module Index
 * 
 * Exports all validation functions expected by the test suite.
 */

import { validatePath as pathValidator } from './path';
import { validateApiKey as apiKeyValidator } from './api-key/validateApiKey';

/**
 * Validate file patterns with path variables
 */
export function validateFilePattern(pattern: string): true {
    if (!pattern || pattern.trim().length === 0) {
        throw new Error('File pattern cannot be empty');
    }

    // Check for path traversal
    if (pattern.includes('../') || pattern.includes('..\\')) {
        throw new Error('File pattern cannot contain path traversal');
    }

    // Check for absolute paths
    if (pattern.startsWith('/') || /^[A-Za-z]:\\/.test(pattern)) {
        throw new Error('File pattern must be relative');
    }

    // Check for invalid characters
    const invalidChars = /[<>|:]/;
    if (invalidChars.test(pattern)) {
        throw new Error('File pattern contains invalid characters');
    }

    // Check for double slashes
    if (pattern.includes('//')) {
        throw new Error('File pattern cannot contain double slashes');
    }

    // Check for pattern length
    if (pattern.length > 250) {
        throw new Error('File pattern is too long');
    }

    // Extract variables
    const variables = pattern.match(/\{([^}]+)\}/g) || [];
    const supportedVariables = ['{timestamp}', '{date}', '{stepId}'];
    
    // Check for unmatched brackets
    const openBrackets = (pattern.match(/\{/g) || []).length;
    const closeBrackets = (pattern.match(/\}/g) || []).length;
    if (openBrackets !== closeBrackets) {
        throw new Error('File pattern contains unmatched brackets');
    }

    // Check for empty variables
    if (pattern.includes('{}')) {
        throw new Error('File pattern contains empty variable');
    }

    // Reject {filename} template variable - no longer supported
    const filenameVariables = variables.filter(v => v === '{filename}');
    if (filenameVariables.length > 0) {
        throw new Error('File pattern contains {filename} template variable which is no longer supported. Use directory paths ending with \'/\' instead');
    }

    // Check for unsupported variables
    const unsupportedVariables = variables.filter(v => !supportedVariables.includes(v) && v !== '{filename}');
    if (unsupportedVariables.length > 0) {
        throw new Error(`File pattern contains unsupported variables: ${unsupportedVariables.join(', ')}`);
    }

    // Validate directory paths - should end with '/' for consistent behavior
    if (!pattern.endsWith('/') && !variables.some(v => ['{timestamp}', '{date}', '{stepId}'].includes(v))) {
        throw new Error('File pattern should end with \'/\' to indicate directory path');
    }

    return true;
}

/**
 * Validate pipeline step configuration
 */
export function validatePipelineStep(step: any, stepId: string): true {
    if (!step) {
        throw new Error(`Step ${stepId} is missing or invalid`);
    }

    // Check for required fields
    const requiredFields = ['modelConfig'];
    const missingFields = requiredFields.filter(field => !step[field]);
    if (missingFields.length > 0) {
        throw new Error(`Step ${stepId} is missing required fields: ${missingFields.join(', ')}`);
    }

    // Validate modelConfig format
    if (typeof step.modelConfig !== 'string' || step.modelConfig.trim().length === 0) {
        throw new Error(`modelConfig must be a non-empty string in step ${stepId}`);
    }

    // Simple format validation - should be alphanumeric with hyphens
    if (!/^[a-zA-Z][a-zA-Z0-9-]*$/.test(step.modelConfig)) {
        throw new Error(`Invalid modelConfig format in step ${stepId}`);
    }

    // Validate input pattern if present
    if (step.input) {
        try {
            validateFilePattern(step.input);
        } catch (error) {
            throw new Error(`Step ${stepId} input pattern is invalid: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    // Validate output pattern if present
    if (step.output && typeof step.output === 'string') {
        try {
            validateFilePattern(step.output);
        } catch (error) {
            throw new Error(`Step ${stepId} output pattern is invalid: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    // Validate archive pattern if present
    if (step.archive) {
        try {
            validateFilePattern(step.archive);
        } catch (error) {
            throw new Error(`Step ${stepId} archive pattern is invalid: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    // Validate prompts array
    if (step.prompts !== undefined) {
        if (!Array.isArray(step.prompts)) {
            throw new Error(`Step ${stepId} prompts field must be an array`);
        }
        
        if (!step.prompts.every((item: any) => typeof item === 'string')) {
            throw new Error(`Step ${stepId} prompt file paths must be strings`);
        }
    }

    // Validate context array
    if (step.context !== undefined) {
        if (!Array.isArray(step.context)) {
            throw new Error(`Step ${stepId} context field must be an array`);
        }
        
        if (!step.context.every((item: any) => typeof item === 'string')) {
            throw new Error(`Step ${stepId} context file paths must be strings`);
        }
    }

    // Validate routing-aware output if present
    if (step.routingAwareOutput !== undefined) {
        if (typeof step.routingAwareOutput !== 'object' || Array.isArray(step.routingAwareOutput)) {
            throw new Error(`Step ${stepId} routingAwareOutput must be an object`);
        }

        // Validate step IDs and paths
        for (const [routingStepId, outputPath] of Object.entries(step.routingAwareOutput)) {
            if (typeof routingStepId !== 'string' || routingStepId.trim().length === 0) {
                throw new Error(`Step ${stepId} contains invalid step ID in routingAwareOutput`);
            }

            if (typeof outputPath !== 'string' || (outputPath as string).trim().length === 0) {
                throw new Error(`Step ${stepId} contains invalid output path in routingAwareOutput`);
            }

            // Validate step ID format
            if (!/^[a-zA-Z][a-zA-Z0-9-]*$/.test(routingStepId)) {
                throw new Error(`Step ${stepId} contains invalid step ID format in routingAwareOutput: ${routingStepId}`);
            }
        }
    }

    return true;
}

/**
 * Validate complete pipeline configuration
 */
export function validatePipelineConfig(config: any): true {
    if (!config || typeof config !== 'object') {
        throw new Error('Pipeline configuration must be a valid object');
    }

    const stepIds = Object.keys(config);
    if (stepIds.length === 0) {
        throw new Error('Pipeline configuration cannot be empty');
    }

    // Check for too many steps
    if (stepIds.length > 20) {
        throw new Error('Pipeline configuration has too many pipeline steps (limit: 20)');
    }

    // Validate each step
    for (const stepId of stepIds) {
        // Validate step ID format
        if (!/^[a-zA-Z][a-zA-Z0-9-]*$/.test(stepId)) {
            throw new Error(`Step ID ${stepId} must start with a letter and contain only letters, numbers, and hyphens`);
        }

        try {
            validatePipelineStep(config[stepId], stepId);
        } catch (error) {
            throw new Error(`Step ${stepId} configuration is invalid: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    // Validate step references in routing-aware output
    const allStepIds = new Set(stepIds);
    const referencedSteps = new Set<string>();

    for (const [stepId, step] of Object.entries(config)) {
        if ((step as any).routingAwareOutput) {
            const routingStepIds = Object.keys((step as any).routingAwareOutput).filter(id => id !== 'default');
            
            for (const referencedStepId of routingStepIds) {
                referencedSteps.add(referencedStepId);
                
                if (!allStepIds.has(referencedStepId)) {
                    throw new Error(`Step ${stepId} references non-existent step: ${referencedStepId}`);
                }
            }
        }
    }

    // Check for circular references (simplified check)
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    function hasCycle(stepId: string): boolean {
        if (recursionStack.has(stepId)) {
            return true;
        }
        if (visited.has(stepId)) {
            return false;
        }

        visited.add(stepId);
        recursionStack.add(stepId);

        const step = config[stepId];
        if (step.routingAwareOutput) {
            const nextSteps = Object.keys(step.routingAwareOutput).filter(id => id !== 'default');
            for (const nextStep of nextSteps) {
                if (allStepIds.has(nextStep) && hasCycle(nextStep)) {
                    return true;
                }
            }
        }

        recursionStack.delete(stepId);
        return false;
    }

    for (const stepId of stepIds) {
        if (hasCycle(stepId)) {
            throw new Error('Pipeline configuration contains circular references');
        }
    }

    // Check for orphaned steps
    // Valid entry points: steps that are not referenced by others AND have an input field
    // Orphaned steps: steps that are not referenced by others AND do not have an input field
    const unreferencedSteps = stepIds.filter(stepId => !referencedSteps.has(stepId));
    const validEntryPoints = unreferencedSteps.filter(stepId => config[stepId].input);
    const orphanedSteps = unreferencedSteps.filter(stepId => !config[stepId].input);

    if (orphanedSteps.length > 0) {
        throw new Error(`Pipeline configuration contains orphaned steps: ${orphanedSteps.join(', ')}`);
    }

    // Ensure there is at least one valid entry point
    if (validEntryPoints.length === 0) {
        throw new Error('Pipeline configuration must have at least one entry point (step with input field that is not referenced by others)');
    }

    return true;
}

/**
 * Validate multiple common fields at once
 */
export function validateCommon(data: any): true {
    if (data.path !== undefined) {
        validatePath(data.path, 'common validation');
    }

    if (data.apiKey !== undefined) {
        validateApiKey(data.apiKey);
    }

    if (data.filePattern !== undefined) {
        validateFilePattern(data.filePattern);
    }

    return true;
}

// Re-export individual validators
export const validatePath = pathValidator;
export const validateApiKey = apiKeyValidator;

/**
 * Validators object for convenience
 */
export const Validators = {
    path: validatePath,
    apiKey: validateApiKey,
    filePattern: validateFilePattern,
    pipelineStep: validatePipelineStep,
    pipelineConfig: validatePipelineConfig
};