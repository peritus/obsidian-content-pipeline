// Type declarations for generated config modules

declare module '@/configs' {
    import { ModelsConfig, PipelineConfiguration } from '../types';

    interface GeneratedConfig {
        models: ModelsConfig;
        pipeline: PipelineConfiguration;
        examplePrompts: Record<string, string>;
    }

    interface GeneratedConfigs {
        [configName: string]: GeneratedConfig;
    }

    export const BUNDLED_PIPELINE_CONFIGS: GeneratedConfigs;
    export const BUNDLED_MODELS_CONFIG: ModelsConfig;
}
