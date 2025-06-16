import { ModelsConfig, PipelineConfiguration } from '../types';
import { DEFAULT_CONFIGS } from '@/configs';

/**
 * Type for generated configuration structure
 */
export interface GeneratedConfig {
    models: ModelsConfig;
    pipeline: PipelineConfiguration;
    prompts: Record<string, string>;
}

export interface GeneratedConfigs {
    [configName: string]: GeneratedConfig;
}

/**
 * Default models configuration loaded from generated configs
 * Contains API credentials and model implementation details (private)
 */
export const DEFAULT_MODELS_CONFIG: ModelsConfig = DEFAULT_CONFIGS.default.models;

/**
 * Default pipeline configuration loaded from generated configs
 * Contains workflow logic without sensitive data (shareable)
 */
export const DEFAULT_PIPELINE_CONFIG: PipelineConfiguration = DEFAULT_CONFIGS.default.pipeline;

/**
 * All available configurations from examples
 */
export const AVAILABLE_CONFIGS: GeneratedConfigs = DEFAULT_CONFIGS;

/**
 * Get a specific configuration by name
 * @param configName - Name of the configuration (e.g., 'default', 'simple')
 * @returns The configuration object or undefined if not found
 */
export function getConfig(configName: string): GeneratedConfig | undefined {
    return DEFAULT_CONFIGS[configName];
}

/**
 * Get available configuration names
 * @returns Array of available configuration names
 */
export function getAvailableConfigNames(): string[] {
    return Object.keys(DEFAULT_CONFIGS);
}