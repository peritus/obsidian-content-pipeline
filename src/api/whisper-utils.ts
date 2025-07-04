/**
 * Utility functions for Whisper API client
 */

import { WHISPER_LIMITS } from './whisper-types';
import * as v from 'valibot';
import { audioFileSchema } from '../validation/schemas';

/**
 * Generate unique request ID for tracking
 */
export function generateRequestId(): string {
    return `whisper-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get MIME type for audio file based on extension
 */
export function getMimeType(filename: string): string {
    const extension = filename.toLowerCase().split('.').pop();
    const mimeTypes: Record<string, string> = {
        'mp3': 'audio/mpeg',
        'wav': 'audio/wav',
        'm4a': 'audio/mp4',
        'mp4': 'video/mp4',
        'webm': 'audio/webm',
        'ogg': 'audio/ogg'
    };
    return mimeTypes[extension || ''] || 'audio/mpeg';
}

/**
 * Check if file type is supported by Whisper API
 */
export function isSupportedAudioFile(filename: string): boolean {
    const extension = filename.toLowerCase().split('.').pop();
    return WHISPER_LIMITS.supportedFormats.includes(extension as any);
}

/**
 * Calculate exponential backoff delay for retries
 */
export function calculateBackoffDelay(attempt: number, maxDelay = 5000): number {
    return Math.min(1000 * Math.pow(2, attempt - 1), maxDelay);
}

/**
 * Check if error should trigger a retry
 */
export function shouldRetryError(error: Error): boolean {
    const message = error.message.toLowerCase();
    
    // Don't retry authentication or permission errors
    if (message.includes('401') || message.includes('403')) {
        return false;
    }
    
    // Don't retry file too large errors
    if (message.includes('413')) {
        return false;
    }
    
    // Don't retry bad request errors
    if (message.includes('400')) {
        return false;
    }
    
    // Retry on network errors, timeouts, and server errors
    return true;
}