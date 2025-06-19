import { ModelsConfig, PipelineConfiguration } from '../types';
import { DEFAULT_CONFIGS } from '@/configs';

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
