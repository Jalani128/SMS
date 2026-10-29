import { GeminiProvider } from './gemini.provider.js';
import { OpenAIProvider } from './openai.provider.js';
import { env } from '../../config/env.js';
export * from './aiProvider.interface.js';
export * from './gemini.provider.js';
export * from './openai.provider.js';
let customProviderInstance = null;
/**
 * Injects a custom or mock AI provider (primarily used for deterministic automated testing)
 */
export const setAIProviderForTesting = (provider) => {
    customProviderInstance = provider;
};
/**
 * Returns the active AI provider singleton according to server configuration
 */
export const getAIProvider = () => {
    if (customProviderInstance) {
        return customProviderInstance;
    }
    const providerType = (env.AI_PROVIDER || 'gemini').toLowerCase().trim();
    switch (providerType) {
        case 'openai':
            return new OpenAIProvider();
        case 'gemini':
        default:
            return new GeminiProvider();
    }
};
