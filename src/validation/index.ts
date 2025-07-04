/**
 * Validation Module Index
 * 
 * Unified Valibot-native validation API.
 * Phase 2: Complete replacement of business logic validation classes.
 */

// Basic validation functions (Phase 1)
export {
    validateApiKey,
    validatePath,
    validateFilePattern,
    validateModelConfig,
    validateModelsConfig,
    validatePipelineStep,
    validateCommon,
    Validators
} from './schemas';

// Advanced validation functions (Phase 2) - Valibot-native
export {
    validateConfig,
    validatePipelineConfig,
    isValidConfig,
    getConfigErrors,
    validateConfigFromJson,
    configSchema,
    pipelineConfigAdvanced
} from './config-validation';

// Configuration resolution utilities
export {
    resolveOutputPath,
    resolveStep,
    findEntryPoints,
    getAvailableNextSteps,
    hasRoutingOutput,
    parseAndValidateConfig
} from './config-resolver';

// Legacy exports for transition period
export { validatePipelineConfig as validatePipelineConfigBasic } from './schemas';