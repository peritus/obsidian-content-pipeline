/**
 * Utility functions for Chat API client
 */

import { CHAT_LIMITS } from './chat-types';
import { ErrorFactory } from '../error-handler';

/**
 * Generate unique request ID for tracking
 */
export function generateChatRequestId(): string {
    return `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Check if model is supported by the chat API
 */
export function isSupportedChatModel(model: string): boolean {
    return CHAT_LIMITS.supportedModels.includes(model as any);
}

/**
 * Get list of supported chat models
 */
export function getSupportedChatModels(): string[] {
    return [...CHAT_LIMITS.supportedModels];
}

/**
 * Validate YAML request data before sending to API
 */
export function validateYamlRequest(yamlRequest: string, model: string): void {
    if (!yamlRequest || yamlRequest.trim().length === 0) {
        throw ErrorFactory.api(
            'YAML request is empty or invalid',
            'Cannot process empty request',
            { requestSize: yamlRequest?.length },
            ['Check if YAML request is properly formatted', 'Ensure request content is not empty']
        );
    }

    if (yamlRequest.length > CHAT_LIMITS.maxRequestSize) {
        throw ErrorFactory.api(
            `Request too large: ${yamlRequest.length} bytes (max: ${CHAT_LIMITS.maxRequestSize} bytes)`,
            'Request exceeds OpenAI size limit',
            { requestSize: yamlRequest.length, maxSize: CHAT_LIMITS.maxRequestSize },
            ['Reduce request content', 'Split large requests', 'Use fewer include files']
        );
    }

    if (!isSupportedChatModel(model)) {
        throw ErrorFactory.api(
            `Unsupported model: ${model}`,
            'Model not supported by Chat API',
            { model, supportedModels: CHAT_LIMITS.supportedModels },
            ['Use a supported model', 'Check model name spelling']
        );
    }
}

/**
 * Convert YAML request to OpenAI chat messages
 * 
 * This function sends the entire YAML-formatted request as a single user message,
 * allowing the LLM to process the structured frontmatter format as intended.
 */
export function yamlToMessages(yamlRequest: string): Array<{ role: 'system' | 'user'; content: string }> {
    // Always send the complete YAML request as a single user message
    // This preserves the YAML frontmatter structure that the LLM needs to understand
    return [
        {
            role: 'user',
            content: yamlRequest.trim()
        }
    ];
}

/**
 * Calculate exponential backoff delay for retries
 */
export function calculateChatBackoffDelay(attempt: number, maxDelay = 10000): number {
    return Math.min(2000 * Math.pow(2, attempt - 1), maxDelay);
}

/**
 * Check if error should trigger a retry
 */
export function shouldRetryChatError(error: Error): boolean {
    const message = error.message.toLowerCase();
    
    // Don't retry authentication or permission errors
    if (message.includes('401') || message.includes('403')) {
        return false;
    }
    
    // Don't retry request too large errors
    if (message.includes('413')) {
        return false;
    }
    
    // Don't retry bad request errors (usually model or format issues)
    if (message.includes('400')) {
        return false;
    }
    
    // Don't retry content policy violations
    if (message.includes('content_policy')) {
        return false;
    }
    
    // Retry on rate limits, network errors, timeouts, and server errors
    if (message.includes('429') || message.includes('rate limit')) {
        return true;
    }
    
    // Retry on network errors, timeouts, and server errors
    return true;
}

/**
 * Estimate token count for request (rough approximation)
 */
export function estimateTokenCount(text: string): number {
    // Rough approximation: 1 token ≈ 4 characters for English text
    return Math.ceil(text.length / 4);
}

/**
 * Check if estimated tokens exceed model limits
 */
export function validateTokenCount(yamlRequest: string, maxTokens?: number): void {
    const estimatedTokens = estimateTokenCount(yamlRequest);
    const limit = maxTokens || CHAT_LIMITS.maxTokens;
    
    if (estimatedTokens > limit * 0.8) { // Use 80% of limit as safety margin
        throw ErrorFactory.api(
            `Request may exceed token limit: ~${estimatedTokens} tokens (limit: ${limit})`,
            'Request might be too long for the model',
            { estimatedTokens, limit },
            ['Reduce request content', 'Use fewer include files', 'Choose a model with higher token limit']
        );
    }
}