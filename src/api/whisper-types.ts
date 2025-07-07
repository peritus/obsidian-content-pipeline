/**
 * Type definitions for OpenAI Whisper API client
 */

export interface WhisperConfig {
    apiKey: string;
    baseUrl?: string;
    organization?: string;
    timeout?: number;
    maxRetries?: number;
}

export interface TranscriptionOptions {
    language?: string;
    prompt?: string;
    responseFormat?: 'text' | 'json' | 'srt' | 'verbose_json' | 'vtt';
    temperature?: number;
}

export interface TranscriptionResult {
    text: string;
    duration?: number;
    language?: string;
    model: string;
    requestId: string;
}

export const DEFAULT_WHISPER_CONFIG = {
    baseUrl: 'https://api.openai.com/v1',
    timeout: 30000,
    maxRetries: 3,
    responseFormat: 'text' as const
};

export const WHISPER_LIMITS = {
    maxFileSize: 25 * 1024 * 1024, // 25MB
    supportedFormats: ['mp3', 'wav', 'm4a', 'mp4', 'webm', 'ogg'] as const,
    supportedExtensions: ['.mp3', '.wav', '.m4a', '.mp4', '.webm', '.ogg'] as const
};
