import { AudioInboxSettings } from '../../types';
import { DEFAULT_MODELS_CONFIG, DEFAULT_PIPELINE_CONFIG } from '../default-config';

/**
 * Default settings for the plugin (v1.2 dual configuration)
 */
export const DEFAULT_SETTINGS: AudioInboxSettings = {
    modelsConfig: JSON.stringify(DEFAULT_MODELS_CONFIG, null, 2),
    pipelineConfig: JSON.stringify(DEFAULT_PIPELINE_CONFIG, null, 2),
    importedExamplePrompts: undefined,
    debugMode: false,
    version: '1.0.0',
    lastSaved: undefined
};