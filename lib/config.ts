/**
 * Steph Configuration
 * 
 * Configure via environment variables. Supports different settings for preview vs production.
 * See .env.example for all available options.
 */

// Helper to parse environment variables
const getEnvString = (key: string, defaultValue: string): string => {
  return process.env[key] || defaultValue
}

const getEnvNumber = (key: string, defaultValue: number): number => {
  const value = process.env[key]
  return value ? parseInt(value, 10) : defaultValue
}

const getEnvBoolean = (key: string, defaultValue: boolean): boolean => {
  const value = process.env[key]
  if (value === undefined) return defaultValue
  return value === 'true' || value === '1' || value === 'yes'
}

export const config = {
  // ============================================
  // LLM Model Settings
  // ============================================
  
  /**
   * Model to use for chat responses.
   * 
   * Options (via Vercel AI Gateway):
   * - 'openai/gpt-4o-mini'     - Fast, cheap, good for most cases (default)
   * - 'openai/gpt-4o'          - Smarter, more expensive
   * - 'openai/gpt-5-mini'      - Latest mini model
   * - 'anthropic/claude-sonnet-4-20250514' - Claude Sonnet
   * - 'anthropic/claude-opus-4.6'          - Claude Opus (most capable)
   * - 'google/gemini-3-flash'  - Fast Google model
   * 
   * Environment variable: STEPH_MODEL
   */
  model: getEnvString('STEPH_MODEL', 'openai/gpt-4o-mini'),

  /**
   * Temperature controls randomness (0.0 - 2.0)
   * - Lower (0.0-0.3): More focused, deterministic
   * - Medium (0.5-0.7): Balanced (recommended)
   * - Higher (0.8-1.2): More creative, varied
   * 
   * Environment variable: STEPH_TEMPERATURE
   */
  temperature: getEnvNumber('STEPH_TEMPERATURE', 7) / 10, // Divided by 10 to allow 0.7 as "7"

  /**
   * Maximum tokens in the response.
   * - 512: Short responses
   * - 1024: Medium responses (default)
   * - 2048: Longer, more detailed responses
   * 
   * Environment variable: STEPH_MAX_TOKENS
   */
  maxTokens: getEnvNumber('STEPH_MAX_TOKENS', 1024),

  // ============================================
  // Rate Limiting
  // ============================================

  /**
   * Maximum requests allowed per time window.
   * Prevents abuse and controls costs.
   */
  rateLimit: {
    /** 
     * Number of requests allowed per window
     * Environment variable: STEPH_RATE_LIMIT_MAX
     */
    maxRequests: getEnvNumber('STEPH_RATE_LIMIT_MAX', 10),
    
    /** 
     * Time window in seconds
     * Environment variable: STEPH_RATE_LIMIT_WINDOW_SECONDS
     */
    windowSeconds: getEnvNumber('STEPH_RATE_LIMIT_WINDOW_SECONDS', 60),
  },

  // ============================================
  // Conversation Settings
  // ============================================

  /**
   * How long before a conversation is considered "new" (in milliseconds).
   * Messages within this window are grouped into the same conversation.
   * 
   * Environment variable: STEPH_CONVERSATION_TIMEOUT_MS
   */
  conversationTimeoutMs: getEnvNumber('STEPH_CONVERSATION_TIMEOUT_MS', 3600000),
}
