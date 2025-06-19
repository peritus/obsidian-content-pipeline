/**
 * Type definitions for OpenAI Chat API client
 */

export interface ChatConfig {
    apiKey: string;
    baseUrl?: string;
    organization?: string;
    timeout?: number;
    maxRetries?: number;
}

export interface ChatOptions {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
    stop?: string | string[];
}

export interface ChatResult {
    content: string;
    model: string;
    requestId: string;
    duration: number;
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
}

interface OpenAIMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface OpenAIChatRequest {
    model: string;
    messages: OpenAIMessage[];
    temperature?: number;
    max_tokens?: number;
    top_p?: number;
    frequency_penalty?: number;
    presence_penalty?: number;
    stop?: string | string[];
}

export interface OpenAIChatResponse {
    id: string;
    object: string;
    created: number;
    model: string;
    choices: Array<{
        index: number;
        message: {
            role: string;
            content: string;
        };
        finish_reason: string;
    }>;
    usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}

export const DEFAULT_CHAT_CONFIG = {
    baseUrl: 'https://api.openai.com/v1',
    timeout: 60000,
    maxRetries: 3,
    model: 'gpt-4',
    temperature: 0.1,
    maxTokens: 4000
};

export const CHAT_LIMITS = {
    maxRequestSize: 8 * 1024 * 1024, // 8MB
    maxTokens: 128000, // GPT-4 context limit
    supportedModels: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo', 'gpt-4o'] as const
};
