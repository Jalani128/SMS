export interface AIGenerateOptions {
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  timeoutMs?: number;
}

export interface IAIProvider {
  /**
   * Identifies the provider name (e.g., 'gemini', 'openai')
   */
  getProviderName(): string;

  /**
   * Checks if the provider has necessary API credentials configured
   */
  isConfigured(): boolean;

  /**
   * Generates freeform text from a prompt and optional system context
   */
  generateText(prompt: string, options?: AIGenerateOptions): Promise<string>;

  /**
   * Generates and validates structured JSON output against an expected structure
   */
  generateStructured<T>(
    prompt: string,
    schemaDescription: string,
    options?: AIGenerateOptions
  ): Promise<T>;
}
