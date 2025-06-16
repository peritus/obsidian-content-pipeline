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
    
    export const DEFAULT_CONFIGS: GeneratedConfigs;
}