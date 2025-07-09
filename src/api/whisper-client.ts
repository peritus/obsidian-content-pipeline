/**
 * OpenAI Whisper API Client for Audio Transcription
 */

import { createLogger } from '../logger';
import { ContentPipelineError, isContentPipelineError } from '../errors';
import { WhisperConfig, TranscriptionOptions, TranscriptionResult, DEFAULT_WHISPER_CONFIG } from './whisper-types';
import { generateRequestId, getMimeType, calculateBackoffDelay, shouldRetryError } from './whisper-utils';
import * as v from 'valibot';
import { audioFileSchema } from '../validation/schemas';

const logger = createLogger('WhisperClient');

export class WhisperClient {
    private config: WhisperConfig & Required<Pick<WhisperConfig, 'baseUrl' | 'timeout' | 'maxRetries'>>;

    constructor(config: WhisperConfig) {
        this.config = { ...DEFAULT_WHISPER_CONFIG, ...config };

        if (!this.config.apiKey) {
            throw new ContentPipelineError('API key required');
        }
    }

    async transcribeAudio(
        audioData: ArrayBuffer,
        filename: string,
        options: TranscriptionOptions = {}
    ): Promise<TranscriptionResult> {
        const requestId = generateRequestId();
        const startTime = Date.now();

        try {
            logger.info(`Transcribing: ${filename}`, { requestId });

            // Validate audio data directly with Valibot
            v.parse(audioFileSchema, { audioData, filename });

            const formData = this.createFormData(audioData, filename, options);
            const response = await this.makeRequestWithRetry(formData);
            const text = await response.text();

            if (!text?.trim()) {
                throw new ContentPipelineError('Empty transcription from API');
            }

            logger.info(`Transcription complete: ${filename}`, { requestId });
            return {
                text: text.trim(),
                model: 'whisper-1',
                requestId,
                duration: Date.now() - startTime
            };

        } catch (error) {
            logger.error(`Transcription failed: ${filename}`, { requestId, error });

            if (isContentPipelineError(error)) {
                throw error;
            }

            throw new ContentPipelineError(`Whisper API request failed: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error : undefined);
        }
    }

    private createFormData(audioData: ArrayBuffer, filename: string, options: TranscriptionOptions): FormData {
        const formData = new FormData();
        formData.append('file', new Blob([audioData], { type: getMimeType(filename) }), filename);
        formData.append('model', 'whisper-1');

        if (options.language) formData.append('language', options.language);
        if (options.prompt) formData.append('prompt', options.prompt);
        if (options.responseFormat) formData.append('response_format', options.responseFormat);
        if (options.temperature !== undefined) formData.append('temperature', options.temperature.toString());

        return formData;
    }

    private async makeRequestWithRetry(formData: FormData): Promise<Response> {
        let lastError: Error | null = null;

        for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
            try {
                const response = await fetch(`${this.config.baseUrl}/audio/transcriptions`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.config.apiKey}`,
                        ...(this.config.organization && { 'OpenAI-Organization': this.config.organization })
                    },
                    body: formData,
                    signal: AbortSignal.timeout(this.config.timeout)
                });

                if (!response.ok) {
                    const errorText = await response.text().catch(() => 'Unknown error');
                    throw new Error(`HTTP ${response.status}: ${errorText}`);
                }

                return response;

            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));

                if (!shouldRetryError(lastError) || attempt === this.config.maxRetries) {
                    throw lastError;
                }

                await new Promise(resolve => setTimeout(resolve, calculateBackoffDelay(attempt)));
            }
        }

        // This should never be reached, but if it is, throw a generic error
        throw lastError || new ContentPipelineError('All retry attempts failed with unknown error');
    }
}
