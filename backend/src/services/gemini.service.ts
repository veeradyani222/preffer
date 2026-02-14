/**
 * Gemini Service - Reusable Gemini API wrapper with automatic model fallback
 * 
 * In development: routes all calls through Archestra LLM Proxy for monitoring & safety.
 * In production: uses direct Google Gemini API with model fallback on rate limits.
 */

import { GoogleGenerativeAI, GenerationConfig } from '@google/generative-ai';
import archestraConfig from '../config/archestra';
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
// ARCHESTRA LLM PROXY (development only)
// ============================================

/**
 * Generate content via Archestra LLM Proxy.
 * Uses OpenAI-compatible chat/completions format that Archestra expects.
 */
async function generateViaProxy(
    config: GenerationConfig,
    prompt: string
): Promise<string> {
    const configuredEndpoint = archestraConfig.llmProxyUrl!;
    const normalizedEndpoint = configuredEndpoint.replace(/\/+$/, '');
    const modelName = GEMINI_MODELS[currentModelIndex] || 'gemini-2.0-flash';
    const isOpenAiStyleEndpoint = /\/chat\/completions$/i.test(normalizedEndpoint);

    let endpoint = normalizedEndpoint;
    let headers: Record<string, string> = { 'Content-Type': 'application/json' };
    let body: Record<string, any>;

    if (isOpenAiStyleEndpoint) {
        // OpenAI-compatible proxy endpoint
        headers.Authorization = `Bearer ${archestraConfig.apiKey || process.env.GEMINI_API_KEY || ''}`;
        body = {
            model: modelName,
            messages: [{ role: 'user', content: prompt }],
            temperature: config.temperature ?? 0.7,
            max_tokens: config.maxOutputTokens ?? 2000,
            ...(config.responseMimeType === 'application/json' && {
                response_format: { type: 'json_object' }
            })
        };
    } else {
        // Gemini-native proxy endpoint:
        // - either ARCHESTRA_LLM_PROXY_URL already includes /v1/gemini/{profile}
        // - or derive full endpoint from baseUrl + profileId
        if (normalizedEndpoint.includes('/v1/gemini/')) {
            endpoint = `${normalizedEndpoint}/v1beta/models/${modelName}:generateContent`;
        } else {
            if (!archestraConfig.baseUrl || !archestraConfig.profileId) {
                throw new Error(
                    'Invalid Archestra Gemini proxy config. Set ARCHESTRA_LLM_PROXY_URL to /v1/gemini/{profileId} or provide ARCHESTRA_PROFILE_ID.'
                );
            }
            endpoint = `${archestraConfig.baseUrl}/v1/gemini/${archestraConfig.profileId}/v1beta/models/${modelName}:generateContent`;
        }

        headers['x-goog-api-key'] = process.env.GEMINI_API_KEY || '';
        body = {
            contents: [
                {
                    role: 'user',
                    parts: [{ text: prompt }]
                }
            ],
            generationConfig: {
                temperature: config.temperature ?? 0.7,
                maxOutputTokens: config.maxOutputTokens ?? 2000,
                ...(config.responseMimeType && { responseMimeType: config.responseMimeType })
            }
        };
    }

    logger.ai('Routing through Archestra LLM Proxy', { endpoint });

    const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        const errMsg = `Archestra proxy error ${response.status}: ${errorBody}`;
        logger.error(errMsg);
        throw new Error(errMsg);
    }

    const data = await response.json();

    // OpenAI-compatible + Gemini-native response formats
    const geminiText = data?.candidates?.[0]?.content?.parts
        ?.map((part: any) => part?.text || '')
        .join('')
        ?.trim();
    const text = geminiText
        || data?.choices?.[0]?.message?.content
        || data?.choices?.[0]?.text
        || data?.response
        || '';

    if (!text) {
        throw new Error('Empty response from Archestra LLM Proxy');
    }

    logger.ai('Archestra proxy generation successful');
    return text.trim();
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
    // ── Dev mode: route through Archestra LLM Proxy ──
    if (archestraConfig.useLlmProxy) {
        try {
            return await generateViaProxy(config, prompt);
        } catch (proxyError: any) {
            logger.ai('Archestra proxy failed, falling back to direct Gemini', {
                error: proxyError.message
            });
            // Fall through to direct Gemini calls below
        }
    }

    // ── Production / fallback: direct Gemini API with model cycling ──
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
