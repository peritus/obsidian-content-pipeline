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
    // Advanced configuration validation
    validateConfig,
    isValidConfig,
    getConfigErrors,
    resolveStep,
    
    // Configuration management functions
    parseAndStoreConfigurations,
    parseAndValidateFromJson,
    validateSettingsConfigurations,
    getValidatedPipelineConfiguration,
    getValidatedModelsConfiguration,
    getSafePipelineConfiguration,
    resolveStepFromSettings,
    isConfigurationReady,
    getConfigurationStatus,
    getSettingsValidationErrors,
    
    // Schemas for direct usage (use v.parse(schema, data) instead of wrapper functions)
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
    chatRequestSchema,
    tokenValidationSchema,
    audioFileSchema,
    directoryPathInputSchema,
    filePathInputSchema,
    filenameInputSchema,
    inputPatternSchema,
    fileInfoSchema,
    executionModelConfigSchema,
    resolvedStepSchema,
    executionContextSchema,
    openAIApiKeySchema,
    openAIConfigSchema,
    modelsConfigJsonSchema
} from './schemas';