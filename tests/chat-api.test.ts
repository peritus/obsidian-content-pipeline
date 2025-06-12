/**
 * Chat API Client Tests
 */

import { ChatClient } from '../src/api/chat-client';
import { validateYamlRequest, yamlToMessages, isSupportedChatModel } from '../src/api/chat-utils';
import { DEFAULT_CHAT_CONFIG } from '../src/api/chat-types';

describe('Chat API Integration', () => {
    describe('ChatClient Construction', () => {
        test('should create client with valid config', () => {
            const client = new ChatClient({
                apiKey: 'sk-test123456789012345678901234567890'
            });
            
            expect(client).toBeInstanceOf(ChatClient);
            expect(client.getAvailableModels()).toContain('gpt-4');
        });

        test('should throw error without API key', () => {
            expect(() => {
                new ChatClient({ apiKey: '' });
            }).toThrow(/API key required/);
        });

        test('should merge config with defaults', () => {
            const client = new ChatClient({
                apiKey: 'sk-test123456789012345678901234567890',
                timeout: 45000
            });
            
            expect(client).toBeInstanceOf(ChatClient);
        });
    });

    describe('YAML Utilities', () => {
        test('should validate YAML requests', () => {
            const validRequest = 'This is a test request';
            expect(() => validateYamlRequest(validRequest, 'gpt-4')).not.toThrow();
            
            expect(() => validateYamlRequest('', 'gpt-4')).toThrow(/empty/);
            expect(() => validateYamlRequest('test', 'invalid-model')).toThrow(/Unsupported model/);
        });

        test('should convert YAML to messages', () => {
            const yamlRequest = `---
role: prompt
filename: system.txt
---

You are a helpful assistant.

---
role: input
filename: user.txt
---

Hello, world!`;

            const messages = yamlToMessages(yamlRequest);
            expect(messages).toHaveLength(2);
            expect(messages[0].role).toBe('system');
            expect(messages[0].content).toBe('You are a helpful assistant.');
            expect(messages[1].role).toBe('user');
            expect(messages[1].content).toBe('Hello, world!');
        });

        test('should handle plain text requests', () => {
            const messages = yamlToMessages('Simple request');
            expect(messages).toHaveLength(1);
            expect(messages[0].role).toBe('user');
            expect(messages[0].content).toBe('Simple request');
        });

        test('should validate supported models', () => {
            expect(isSupportedChatModel('gpt-4')).toBe(true);
            expect(isSupportedChatModel('gpt-3.5-turbo')).toBe(true);
            expect(isSupportedChatModel('invalid-model')).toBe(false);
        });
    });

    describe('Configuration', () => {
        test('should provide default configuration', () => {
            expect(DEFAULT_CHAT_CONFIG.baseUrl).toBe('https://api.openai.com/v1');
            expect(DEFAULT_CHAT_CONFIG.timeout).toBe(60000);
            expect(DEFAULT_CHAT_CONFIG.maxRetries).toBe(3);
            expect(DEFAULT_CHAT_CONFIG.model).toBe('gpt-4');
        });
    });
});
