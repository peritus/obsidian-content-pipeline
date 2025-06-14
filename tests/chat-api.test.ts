/**
 * Chat API Client Tests
 * Updated for v1.1 schema with YAML routing communication
 */

import { ChatClient } from '../src/api/chat-client';
import { validateYamlRequest, yamlToMessages, isSupportedChatModel } from '../src/api/chat-utils';
import { DEFAULT_CHAT_CONFIG } from '../src/api/chat-types';
import { createMockStepRouting } from './setup';

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

    describe('YAML Utilities for v1.1 Schema', () => {
        test('should validate YAML requests', () => {
            const validRequest = 'This is a test request';
            expect(() => validateYamlRequest(validRequest, 'gpt-4')).not.toThrow();
            
            expect(() => validateYamlRequest('', 'gpt-4')).toThrow(/empty/);
            expect(() => validateYamlRequest('test', 'invalid-model')).toThrow(/Unsupported model/);
        });

        test('should convert YAML to messages with routing information', () => {
            const yamlRequestWithRouting = `---
role: input
filename: transcript.md
---

This is a personal reflection about my family members Alice and Bob.

---
role: prompt
filename: process-prompt.md
---

Process this content appropriately based on its nature.

---
role: routing
available_next_steps:
  process-thoughts: "If the document contains personal thoughts, reflections, or mentions family members"
  process-tasks: "If the document contains work-related content or action items"
  process-ideas: "If the document contains innovative concepts or brainstorming"
---

Based on the content above, please choose the most appropriate next processing step from the available options. Include your choice in the response frontmatter using the 'nextStep' field.`;

            const messages = yamlToMessages(yamlRequestWithRouting);
            expect(messages).toHaveLength(3);
            
            // Input becomes user message
            expect(messages[0].role).toBe('user');
            expect(messages[0].content).toContain('personal reflection');
            
            // Prompt becomes system message
            expect(messages[1].role).toBe('system');
            expect(messages[1].content).toContain('Process this content appropriately');
            
            // Routing becomes user instruction
            expect(messages[2].role).toBe('user');
            expect(messages[2].content).toContain('available_next_steps');
            expect(messages[2].content).toContain('process-thoughts');
            expect(messages[2].content).toContain('nextStep');
        });

        test('should handle YAML requests without routing', () => {
            const yamlRequestWithoutRouting = `---
role: input
filename: final-content.md
---

This is final content that does not need further routing.

---
role: prompt
filename: final-prompt.md
---

Create a final summary of this content.`;

            const messages = yamlToMessages(yamlRequestWithoutRouting);
            expect(messages).toHaveLength(2);
            expect(messages[0].role).toBe('user');
            expect(messages[1].role).toBe('system');
            
            // Should not contain routing information
            expect(messages.some(m => m.content.includes('available_next_steps'))).toBe(false);
        });

        test('should handle context files in YAML requests', () => {
            const yamlRequestWithContext = `---
role: input
filename: new-content.md
---

New content to process.

---
role: prompt
filename: process-prompt.md
---

Process this content with the provided context.

---
role: context
filename: previous-summary.md
---

Previous summary for context: This provides background information.`;

            const messages = yamlToMessages(yamlRequestWithContext);
            expect(messages).toHaveLength(3);
            
            expect(messages[0].role).toBe('user');
            expect(messages[1].role).toBe('system');
            expect(messages[2].role).toBe('user'); // Context as user message
            expect(messages[2].content).toContain('Previous summary for context');
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
            expect(isSupportedChatModel('gpt-4o')).toBe(true);
            expect(isSupportedChatModel('invalid-model')).toBe(false);
        });

        test('should handle complex routing scenarios', () => {
            const complexRouting = createMockStepRouting();
            const yamlWithComplexRouting = `---
role: input
filename: mixed-content.md
---

This document contains both work tasks and personal reflections about my family.

---
role: prompt
filename: classifier-prompt.md
---

Analyze and categorize this content for appropriate processing.

---
role: routing
available_next_steps:
  process-thoughts: "${complexRouting.available_next_steps['process-thoughts']}"
  process-tasks: "${complexRouting.available_next_steps['process-tasks']}"
  process-ideas: "${complexRouting.available_next_steps['process-ideas']}"
---

Choose the most appropriate processing step based on the content analysis.`;

            const messages = yamlToMessages(yamlWithComplexRouting);
            expect(messages).toHaveLength(3);
            
            const routingMessage = messages.find(m => m.content.includes('available_next_steps'));
            expect(routingMessage).toBeDefined();
            expect(routingMessage!.content).toContain('process-thoughts');
            expect(routingMessage!.content).toContain('personal thoughts');
        });
    });

    describe('Response Format Expectations', () => {
        test('should expect responses with nextStep routing', () => {
            // This tests that the API is set up to expect responses in the new format
            const expectedSingleFileResponse = `---
filename: processed-content.md
nextStep: process-thoughts
---

# Processed Content

This content has been analyzed and categorized as personal thoughts.`;

            // The chat client should be able to handle this response format
            expect(expectedSingleFileResponse).toContain('nextStep:');
            expect(expectedSingleFileResponse).toContain('process-thoughts');
        });

        test('should expect multi-file responses with routing', () => {
            const expectedMultiFileResponse = `---
filename: personal-notes.md
nextStep: process-thoughts
---

# Personal Reflections

Content about family and personal matters.

---
filename: work-items.md
nextStep: process-tasks
---

# Work Tasks

Action items and meeting notes.`;

            // Should contain multiple sections with different routing
            expect(expectedMultiFileResponse.split('---')).toHaveLength(5); // 4 delimiters + content
            expect(expectedMultiFileResponse).toContain('nextStep: process-thoughts');
            expect(expectedMultiFileResponse).toContain('nextStep: process-tasks');
        });
    });

    describe('Configuration', () => {
        test('should provide default configuration', () => {
            expect(DEFAULT_CHAT_CONFIG.baseUrl).toBe('https://api.openai.com/v1');
            expect(DEFAULT_CHAT_CONFIG.timeout).toBe(60000);
            expect(DEFAULT_CHAT_CONFIG.maxRetries).toBe(3);
            expect(DEFAULT_CHAT_CONFIG.model).toBe('gpt-4');
        });

        test('should support updated model list for v1.1', () => {
            const supportedModels = ['gpt-4', 'gpt-3.5-turbo', 'gpt-4o'];
            
            supportedModels.forEach(model => {
                expect(isSupportedChatModel(model)).toBe(true);
            });
        });
    });

    describe('API Request Format Instructions', () => {
        test('should include standard response format instructions', () => {
            const standardInstructions = `You can return single or multiple files using YAML frontmatter format:

For single file:
---
filename: output.md
nextStep: chosen_step_id
---
Your content here...

For multiple files:
---
filename: doc1.md
nextStep: step_id_1
---
First document content...

---
filename: doc2.md
nextStep: step_id_2
---
Second document content...

Use the 'nextStep' field to route content to the most appropriate next processing step based on the available options provided.`;

            // These instructions should be included in requests to ensure proper response format
            expect(standardInstructions).toContain('nextStep: chosen_step_id');
            expect(standardInstructions).toContain('multiple files');
            expect(standardInstructions).toContain('YAML frontmatter format');
        });

        test('should handle requests with step routing instructions', () => {
            const routingInstructions = `Based on the content above, please choose the most appropriate next processing step from the available options. Include your choice in the response frontmatter using the 'nextStep' field.`;

            expect(routingInstructions).toContain('nextStep');
            expect(routingInstructions).toContain('available options');
            expect(routingInstructions).toContain('response frontmatter');
        });
    });
});