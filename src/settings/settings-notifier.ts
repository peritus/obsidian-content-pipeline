/**
 * Settings change notification system
 * 
 * Provides a simple event-driven mechanism for components to be notified
 * when settings change, inspired by the OpenAI API key mechanism.
 */

export type SettingsChangeType = 'models' | 'pipeline' | 'both';

export interface SettingsChangeEvent {
    type: SettingsChangeType;
    modelsConfig?: string;
    pipelineConfig?: string;
}

export type SettingsChangeListener = (event: SettingsChangeEvent) => void;

/**
 * Simple settings change notifier
 */
export class SettingsNotifier {
    private listeners: SettingsChangeListener[] = [];

    /**
     * Subscribe to settings changes
     */
    subscribe(listener: SettingsChangeListener): () => void {
        this.listeners.push(listener);
        
        // Return unsubscribe function
        return () => {
            const index = this.listeners.indexOf(listener);
            if (index > -1) {
                this.listeners.splice(index, 1);
            }
        };
    }

    /**
     * Notify all listeners of a settings change
     */
    notify(event: SettingsChangeEvent): void {
        this.listeners.forEach(listener => {
            try {
                listener(event);
            } catch (error) {
                console.error('Error in settings change listener:', error);
            }
        });
    }

    /**
     * Notify models config change
     */
    notifyModelsChange(modelsConfig: string): void {
        this.notify({
            type: 'models',
            modelsConfig
        });
    }

    /**
     * Notify pipeline config change
     */
    notifyPipelineChange(pipelineConfig: string): void {
        this.notify({
            type: 'pipeline',
            pipelineConfig
        });
    }

    /**
     * Notify both configs changed
     */
    notifyBothChanged(modelsConfig: string, pipelineConfig: string): void {
        this.notify({
            type: 'both',
            modelsConfig,
            pipelineConfig
        });
    }
}