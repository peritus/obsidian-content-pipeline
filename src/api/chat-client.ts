/**
 * OpenAI Chat API Client for YAML Processing
 */

import { createLogger } from '../logger';
import { ErrorFactory } from '../error-handler';
import { YamlParser } from '../core/yaml-processor/yaml-parser';
import { ParsedYamlResponse } from '../types';
import { 
    ChatConfig, 
    ChatOptions, 
    ChatResult, 
    OpenAIChatRequest, 
    OpenAIChatResponse,
    DEFAULT_CHAT_CONFIG 
} from './chat-types';
import { 
    generateChatRequestId, 
    validateYamlRequest, 
    yamlToMessages, 
    calculateChatBackoffDelay, 
    shouldRetryChatError,
    validateTokenCount 
} from './chat-utils';

const logger = createLogger('ChatClient');

export class ChatClient {
    private config: ChatConfig & Required<Pick<ChatConfig, 'baseUrl' | 'timeout' | 'maxRetries'>>;
    private yamlParser: YamlParser;

    constructor(config: ChatConfig) {
        this.config = { ...DEFAULT_CHAT_CONFIG, ...config };
        this.yamlParser = new YamlParser();
        
        if (!this.config.apiKey) {
            throw ErrorFactory.api('API key required', 'No API key provided', {}, ['Provide OpenAI API key']);
        }
    }

    async processYamlRequest(
        yamlRequest: string,
        options: ChatOptions = {}
    ): Promise<ParsedYamlResponse> {
        const requestId = generateChatRequestId();
        const startTime = Date.now();
        const model = options.model || DEFAULT_CHAT_CONFIG.model;
        const url = `${this.config.baseUrl}/chat/completions`;

        try {
            logger.info(`Processing YAML request with ${model}`, { requestId, requestSize: yamlRequest.length });
            
            // Validate request
            validateYamlRequest(yamlRequest, model);
            validateTokenCount(yamlRequest, options.maxTokens);

            // Convert YAML to OpenAI messages
            const messages = yamlToMessages(yamlRequest);
            
            // Prepare request body for logging
            const requestBody = {
                model,
                messages: messages.map(msg => ({
                    role: msg.role,
                    content: msg.content
                })),
                temperature: options.temperature ?? DEFAULT_CHAT_CONFIG.temperature,
                max_tokens: options.maxTokens ?? DEFAULT_CHAT_CONFIG.maxTokens,
                top_p: options.topP,
                frequency_penalty: options.frequencyPenalty,
                presence_penalty: options.presencePenalty,
                stop: options.stop
            };

            // Debug logging: Raw LLM Request
            logger.debug("Raw LLM Request", { 
                endpoint: url,
                model: model,
                requestBody: requestBody,
                requestSize: yamlRequest.length 
            });
            
            // Make API request
            const chatResult = await this.makeChatRequest(messages, model, options, requestId);
            
            // Debug logging: Raw LLM Response
            logger.debug("Raw LLM Response", {
                responseBody: chatResult.content,
                responseSize: chatResult.content.length,
                responseType: typeof chatResult.content,
                model: chatResult.model,
                usage: chatResult.usage,
                duration: chatResult.duration
            });
            
            // Parse response as YAML
            const parsedResponse = this.yamlParser.parseResponse(chatResult.content);
            
            logger.info(`YAML request complete`, { 
                requestId, 
                duration: Date.now() - startTime,
                sectionsReturned: parsedResponse.sections.length,
                isMultiFile: parsedResponse.isMultiFile
            });

            return parsedResponse;

        } catch (error) {
            logger.error(`YAML request failed`, { requestId, error, duration: Date.now() - startTime });
            
            if (error instanceof Error && error.name === 'AudioInboxError') {
                throw error;
            }

            throw ErrorFactory.api(
                `Chat request failed: ${error instanceof Error ? error.message : String(error)}`,
                'Failed to process YAML request',
                { requestId, model, requestSize: yamlRequest.length },
                ['Check connection', 'Verify API key', 'Check request format']
            );
        }
    }

    private async makeChatRequest(
        messages: Array<{ role: 'system' | 'user'; content: string }>,
        model: string,
        options: ChatOptions,
        requestId: string
    ): Promise<ChatResult> {
        const request: OpenAIChatRequest = {
            model,
            messages: messages.map(msg => ({
                role: msg.role,
                content: msg.content
            })),
            temperature: options.temperature ?? DEFAULT_CHAT_CONFIG.temperature,
            max_tokens: options.maxTokens ?? DEFAULT_CHAT_CONFIG.maxTokens,
            top_p: options.topP,
            frequency_penalty: options.frequencyPenalty,
            presence_penalty: options.presencePenalty,
            stop: options.stop
        };

        const response = await this.makeRequestWithRetry(request, requestId);
        const responseData: OpenAIChatResponse = await response.json();
        
        if (!responseData.choices?.[0]?.message?.content) {
            throw ErrorFactory.api('Empty response', 'No content in chat response', { requestId, responseData });
        }

        return {
            content: responseData.choices[0].message.content,
            model: responseData.model,
            requestId,
            duration: Date.now(),
            usage: responseData.usage ? {
                promptTokens: responseData.usage.prompt_tokens,
                completionTokens: responseData.usage.completion_tokens,
                totalTokens: responseData.usage.total_tokens
            } : undefined
        };
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
            const testRequest = 'Test connection';
            await this.processYamlRequest(testRequest, { 
                model: 'gpt-3.5-turbo',
                maxTokens: 10,
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
        return ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo', 'gpt-4o'];
    }
}