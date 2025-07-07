/**
 * OpenAI Chat API Client for Structured Output
 *
 * Pure structured output implementation - YAML processing removed.
 */

import { createLogger } from '../logger';
import { ContentPipelineError, isContentPipelineError } from '../errors';
import {
    ChatConfig,
    ChatOptions,
    OpenAIChatRequest,
    OpenAIChatResponse,
    ProcessedResponse,
    DEFAULT_CHAT_CONFIG
} from './chat-types';
import {
    generateChatRequestId,
    calculateChatBackoffDelay,
    shouldRetryChatError
} from './chat-utils';

const logger = createLogger('ChatClient');

export class ChatClient {
    private config: ChatConfig & Required<Pick<ChatConfig, 'baseUrl' | 'timeout' | 'maxRetries'>>;

    constructor(config: ChatConfig) {
        this.config = { ...DEFAULT_CHAT_CONFIG, ...config };

        if (!this.config.apiKey) {
            throw new ContentPipelineError('API key required');
        }
    }

    async processStructuredRequest(
        prompt: string,
        availableNextSteps: string[] = [],
        options: ChatOptions = {}
    ): Promise<ProcessedResponse> {
        const requestId = generateChatRequestId();
        const startTime = Date.now();
        const model = options.model || DEFAULT_CHAT_CONFIG.model;

        try {
            logger.info(`Processing structured request with ${model}`, { requestId, promptSize: prompt.length });

            // Build JSON schema for response
            const schema = this.buildResponseSchema(availableNextSteps);

            // Create request with structured output
            const request: OpenAIChatRequest = {
                model,
                messages: [{ role: 'user', content: prompt }],
                temperature: options.temperature ?? DEFAULT_CHAT_CONFIG.temperature,
                max_tokens: options.maxTokens ?? DEFAULT_CHAT_CONFIG.maxTokens,
                top_p: options.topP,
                frequency_penalty: options.frequencyPenalty,
                presence_penalty: options.presencePenalty,
                stop: options.stop,
                response_format: {
                    type: 'json_schema',
                    json_schema: {
                        name: 'content_pipeline_response',
                        strict: true,
                        schema
                    }
                }
            };

            // Debug logging: Raw LLM Request
            logger.debug('Raw LLM Structured Request', {
                model: model,
                promptSize: prompt.length,
                schema: schema,
                availableNextSteps: availableNextSteps
            });

            // Make API request
            const response = await this.makeRequestWithRetry(request, requestId);
            const responseData: OpenAIChatResponse = await response.json();

            if (!responseData.choices?.[0]?.message?.content) {
                throw new ContentPipelineError('Empty response from API');
            }

            const jsonContent = responseData.choices[0].message.content;
            const jsonResponse = JSON.parse(jsonContent);

            // Debug logging: Raw LLM Response
            logger.debug('Raw LLM Structured Response', {
                responseBody: jsonContent,
                responseSize: jsonContent.length,
                parsedSections: jsonResponse.sections?.length || 0,
                model: responseData.model,
                usage: responseData.usage
            });

            const processedResponse: ProcessedResponse = {
                sections: jsonResponse.sections,
                isMultiFile: jsonResponse.sections.length > 1,
                rawResponse: jsonContent
            };

            logger.info('Structured request complete', {
                requestId,
                duration: Date.now() - startTime,
                sectionsReturned: processedResponse.sections.length,
                isMultiFile: processedResponse.isMultiFile
            });

            return processedResponse;

        } catch (error) {
            logger.error('Structured request failed', { requestId, error, duration: Date.now() - startTime });

            if (isContentPipelineError(error)) {
                throw error;
            }

            throw new ContentPipelineError(`Chat API request failed: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error : undefined);
        }
    }

    private buildResponseSchema(availableNextSteps: string[]): any {
        // Build item properties conditionally
        const itemProperties: any = {
            filename: { type: 'string' },
            content: { type: 'string' }
        };

        const required = ['filename', 'content'];

        // Add nextStep property only if routing is available
        if (availableNextSteps.length > 0) {
            itemProperties.nextStep = {
                type: 'string',
                enum: availableNextSteps
            };
            // CRITICAL FIX: Add nextStep to required array for strict schema compliance
            required.push('nextStep');
        }

        const schema = {
            type: 'object',
            properties: {
                sections: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: itemProperties,
                        required: required,
                        additionalProperties: false
                    }
                }
            },
            required: ['sections'],
            additionalProperties: false
        };

        return schema;
    }

    private async makeRequestWithRetry(request: OpenAIChatRequest, requestId: string): Promise<Response> {
        let lastError: Error | null = null;

        for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
            try {
                const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.config.apiKey}`,
                        ...(this.config.organization && { 'OpenAI-Organization': this.config.organization })
                    },
                    body: JSON.stringify(request),
                    signal: AbortSignal.timeout(this.config.timeout)
                });

                if (!response.ok) {
                    const errorText = await response.text().catch(() => 'Unknown error');
                    let errorMessage = `HTTP ${response.status}: ${errorText}`;

                    // Parse OpenAI error format if available
                    try {
                        const errorData = JSON.parse(errorText);
                        if (errorData.error?.message) {
                            errorMessage = `${errorData.error.type || 'API Error'}: ${errorData.error.message}`;
                        }
                    } catch {
                        // Keep original error message if parsing fails
                    }

                    throw new Error(errorMessage);
                }

                return response;

            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));

                if (!shouldRetryChatError(lastError) || attempt === this.config.maxRetries) {
                    throw lastError;
                }

                const delay = calculateChatBackoffDelay(attempt);
                logger.warn(`Chat request attempt ${attempt} failed, retrying in ${delay}ms`, {
                    requestId,
                    error: lastError.message
                });

                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }

        throw lastError!;
    }

    /**
     * Test API connection with a simple request
     */
    async testConnection(): Promise<boolean> {
        try {
            const testPrompt = 'Generate a simple test response.';
            await this.processStructuredRequest(testPrompt, [], {
                model: 'gpt-4o',
                maxTokens: 50,
                temperature: 0
            });
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Get available models (placeholder - would need separate API call in real implementation)
     */
    getAvailableModels(): string[] {
        return ['gpt-4-turbo', 'gpt-3.5-turbo', 'gpt-4o'];
    }
}
