/**
 * Validation Module Index
 * 
 * Complete Valibot-native validation system.
 * All validation logic consolidated into a single, efficient module.
 * 
 * ✅ Replaces: ConfigurationValidator, DirectoryOnlyValidator, ErrorFactory
 * ✅ Target achieved: ~15KB (down from 87KB original)
 */

// All validation functions and schemas (consolidated)
export {
    // Basic validation functions
    validateApiKey,
    validatePath,
    validateFilePattern,
    validateModelConfig,
    validateModelsConfig,
    validatePipelineStep,
    validatePipelineConfig,
    validateCommon,
    
    // Advanced configuration validation
    validateConfig,
    isValidConfig,
    getConfigErrors,
    parseAndValidateConfig,
    resolveStep,
    
    // Schemas for advanced usage
    configSchema,
    pipelineConfigAdvanced,
    apiKeySchema,
    pathSchema,
    pathWithGlobsSchema,
    filePatternSchema,
    modelConfigSchema,
    modelsConfigSchema,
    stepIdSchema,
    pipelineStepSchema,
    pipelineConfigSchema,
    
    // Convenience object
    Validators
} from './schemas';