import { ContentPipelineSettings } from '../../types';

/**
 * Default plugin settings - no pre-loaded configurations
 * Users must explicitly load configurations from the settings interface
 */
export const DEFAULT_SETTINGS: ContentPipelineSettings = {
    modelsConfig: '{}',  // Empty configuration - user must load one
    pipelineConfig: '{}',  // Empty configuration - user must load one
    importedExamplePrompts: undefined,
    debugMode: false,
    version: '1.0.0',
    lastSaved: undefined
};