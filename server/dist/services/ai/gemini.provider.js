import { env } from '../../config/env.js';
import { ApiError } from '../../utils/apiError.js';
import { logger } from '../../utils/logger.js';
export class GeminiProvider {
    apiKey;
    model;
    timeoutMs;
    defaultMaxTokens;
    constructor(apiKey, model, timeoutMs, defaultMaxTokens) {
        this.apiKey = apiKey || env.AI_API_KEY;
        this.model = model || env.AI_MODEL || 'gemini-1.5-flash';
        this.timeoutMs = timeoutMs || env.AI_TIMEOUT_MS || 30000;
        this.defaultMaxTokens = defaultMaxTokens || env.AI_MAX_TOKENS || 2048;
    }
    getProviderName() {
        return 'gemini';
    }
    isConfigured() {
        return Boolean(this.apiKey && this.apiKey.trim().length > 0);
    }
    ensureConfigured() {
        if (!this.isConfigured()) {
            throw ApiError.serviceUnavailable('AI provider "gemini" is not configured. Please configure AI_API_KEY in the server environment.');
        }
    }
    async generateText(prompt, options) {
        this.ensureConfigured();
        const timeout = options?.timeoutMs || this.timeoutMs;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeout);
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:generateContent?key=${encodeURIComponent(this.apiKey)}`;
        const requestBody = {
            contents: [
                {
                    role: 'user',
                    parts: [{ text: prompt }],
                },
            ],
            generationConfig: {
                temperature: options?.temperature ?? 0.7,
                maxOutputTokens: options?.maxTokens ?? this.defaultMaxTokens,
            },
        };
        if (options?.systemPrompt) {
            requestBody.systemInstruction = {
                parts: [{ text: options.systemPrompt }],
            };
        }
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
                signal: controller.signal,
            });
            clearTimeout(timer);
            if (!response.ok) {
                const errorText = await response.text();
                logger.error(`[GeminiProvider] API error (${response.status}): ${errorText}`);
                if (response.status === 429) {
                    throw ApiError.tooManyRequests('AI rate limit reached with Gemini API. Please try again shortly.');
                }
                if (response.status === 401 || response.status === 403) {
                    throw ApiError.internal('AI provider authentication failed. Please verify the server AI_API_KEY configuration.');
                }
                throw ApiError.badGateway(`AI provider returned an error (${response.status}). Please try again later.`);
            }
            const data = (await response.json());
            const candidate = data?.candidates?.[0];
            if (!candidate || !candidate.content?.parts?.[0]?.text) {
                if (candidate?.finishReason === 'SAFETY') {
                    throw ApiError.badRequest('The AI provider blocked the content due to safety and appropriateness guidelines.');
                }
                throw ApiError.badGateway('AI provider did not generate a valid text response.');
            }
            return candidate.content.parts[0].text.trim();
        }
        catch (err) {
            clearTimeout(timer);
            if (err.name === 'AbortError') {
                throw ApiError.gatewayTimeout(`AI request timed out after ${timeout}ms. Please try a shorter prompt or try again later.`);
            }
            if (err instanceof ApiError) {
                throw err;
            }
            logger.error('[GeminiProvider] Network failure:', err);
            throw ApiError.badGateway(`Failed to communicate with AI provider: ${err.message}`);
        }
    }
    async generateStructured(prompt, schemaDescription, options) {
        const structuredPrompt = `${prompt}

IMPORTANT: You MUST respond ONLY with a valid JSON object or array conforming to this exact specification:
${schemaDescription}
Do NOT include markdown code blocks, do NOT add introductory or concluding text. Return only the raw JSON.`;
        const rawOutput = await this.generateText(structuredPrompt, {
            ...options,
            temperature: options?.temperature ?? 0.2, // Low temperature for deterministic structured formats
        });
        // Strip code fences if the model included them despite instructions
        let sanitized = rawOutput.trim();
        if (sanitized.startsWith('```json')) {
            sanitized = sanitized.slice(7);
        }
        else if (sanitized.startsWith('```')) {
            sanitized = sanitized.slice(3);
        }
        if (sanitized.endsWith('```')) {
            sanitized = sanitized.slice(0, -3);
        }
        sanitized = sanitized.trim();
        try {
            return JSON.parse(sanitized);
        }
        catch (parseErr) {
            logger.error('[GeminiProvider] Malformed JSON generated by model:', {
                rawOutput,
                error: parseErr.message,
            });
            throw ApiError.badGateway('AI provider generated malformed structured content. Please retry the request.');
        }
    }
}
