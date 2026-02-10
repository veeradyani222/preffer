/**
 * Gemini Service - Reusable Gemini API wrapper with automatic model fallback
 * 
 * Handles rate limiting (429 errors) by automatically cycling through available models.
 * Can be used by any service that needs Gemini API access.
 */

import { GoogleGenerativeAI, GenerationConfig } from '@google/generative-ai';
import logger from '../utils/logger';

// Initialize Gemini AI client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// ============================================
// MODEL CONFIGURATION
// ============================================

// List of models to cycle through when rate limits are hit
const GEMINI_MODELS = [
    'gemini-2.0-flash',
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-2.0-flash-lite',
    'gemini-flash-latest',
    'gemini-flash-lite-latest',
    'gemini-2.5-pro',
    'gemini-pro-latest',
    'gemini-3-flash-preview',
    'gemini-3-pro-preview',
    'gemini-exp-1206',
];

// Track current model index - starts at 0, cycles through on rate limit
let currentModelIndex = 0;

// Track exhausted models with timestamps (model -> exhausted until timestamp)
const exhaustedModels: Map<string, number> = new Map();

// How long to consider a model exhausted (5 minutes)
const MODEL_EXHAUSTION_DURATION_MS = 5 * 60 * 1000;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get the next available model, skipping recently exhausted ones
 */
function getNextAvailableModel(): string {
    const now = Date.now();
    
    // Clean up expired exhaustions
    for (const [model, exhaustedUntil] of exhaustedModels.entries()) {
        if (now > exhaustedUntil) {
            exhaustedModels.delete(model);
            logger.ai('Model cooldown expired', { model });
        }
    }
    
    // Find next available model
    let attempts = 0;
    
    while (attempts < GEMINI_MODELS.length) {
        const model = GEMINI_MODELS[currentModelIndex];
        
        if (!exhaustedModels.has(model)) {
            return model;
        }
        
        // Move to next model
        currentModelIndex = (currentModelIndex + 1) % GEMINI_MODELS.length;
        attempts++;
    }
    
    // All models exhausted - clear oldest and return first available
    logger.ai('All models exhausted, clearing oldest exhaustion');
    const oldestModel = [...exhaustedModels.entries()].sort((a, b) => a[1] - b[1])[0];
    if (oldestModel) {
        exhaustedModels.delete(oldestModel[0]);
        return oldestModel[0];
    }
    
    return GEMINI_MODELS[0];
}

/**
 * Mark a model as exhausted and move to next
 */
function markModelExhausted(model: string): void {
    const exhaustedUntil = Date.now() + MODEL_EXHAUSTION_DURATION_MS;
    exhaustedModels.set(model, exhaustedUntil);
    currentModelIndex = (currentModelIndex + 1) % GEMINI_MODELS.length;
    logger.ai('Model marked as exhausted', { model, cooldownMinutes: MODEL_EXHAUSTION_DURATION_MS / 60000 });
}

/**
 * Check if an error is a rate limit error (429)
 */
function isRateLimitError(error: any): boolean {
    const errorMessage = error?.message || error?.toString() || '';
    return errorMessage.includes('429') || 
           errorMessage.includes('Too Many Requests') || 
           errorMessage.includes('Resource exhausted') ||
           errorMessage.includes('RESOURCE_EXHAUSTED');
}

// ============================================
// MAIN EXPORT
// ============================================

/**
 * Generate content with automatic model fallback on rate limits
 * 
 * @param config - Gemini generation config (temperature, maxOutputTokens, etc.)
 * @param prompt - The prompt to send to the model
 * @param maxRetries - Maximum number of retry attempts (default: 5)
 * @returns The generated text response
 * 
 * @example
 * const response = await generateWithFallback(
 *     { temperature: 0.7, maxOutputTokens: 2000, responseMimeType: 'application/json' },
 *     'Your prompt here'
 * );
 */
export async function generateWithFallback(
    config: GenerationConfig,
    prompt: string,
    maxRetries: number = 5
): Promise<string> {
    let lastError: any;
    let attempts = 0;
    
    while (attempts < maxRetries) {
        const modelName = getNextAvailableModel();
        
        try {
            logger.ai('Attempting generation', { model: modelName, attempt: attempts + 1 });
            
            const model = genAI.getGenerativeModel({
                model: modelName,
                generationConfig: config
            });
            
            const result = await model.generateContent(prompt);
            const text = result.response.text().trim();
            
            logger.ai('Generation successful', { model: modelName });
            return text;
            
        } catch (error: any) {
            lastError = error;
            
            if (isRateLimitError(error)) {
                logger.ai('Rate limit hit, switching model', { 
                    exhaustedModel: modelName, 
                    attempt: attempts + 1 
                });
                markModelExhausted(modelName);
                attempts++;
                // Small delay before retry to be nice to the API
                await new Promise(resolve => setTimeout(resolve, 500));
            } else {
                // Non-rate-limit error, throw immediately
                logger.error('Gemini API error (non-rate-limit)', error);
                throw error;
            }
        }
    }
    
    // All retries exhausted
    logger.error('All model fallback attempts exhausted', lastError);
    throw lastError;
}

/**
 * Get the current model being used (for debugging/logging)
 */
export function getCurrentModel(): string {
    return GEMINI_MODELS[currentModelIndex];
}

/**
 * Get list of all available models
 */
export function getAvailableModels(): string[] {
    return [...GEMINI_MODELS];
}

/**
 * Get count of currently exhausted models
 */
export function getExhaustedModelCount(): number {
    const now = Date.now();
    let count = 0;
    for (const [_, exhaustedUntil] of exhaustedModels.entries()) {
        if (now <= exhaustedUntil) count++;
    }
    return count;
}
