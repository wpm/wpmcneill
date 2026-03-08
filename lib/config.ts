/**
 * Steph Configuration
 * 
 * Edit these values to customize the chatbot behavior.
 */

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
   */
  model: 'openai/gpt-4o-mini',

  /**
   * Temperature controls randomness (0.0 - 2.0)
   * - Lower (0.0-0.3): More focused, deterministic
   * - Medium (0.5-0.7): Balanced (recommended)
   * - Higher (0.8-1.2): More creative, varied
   */
  temperature: 0.7,

  /**
   * Maximum tokens in the response.
   * - 512: Short responses
   * - 1024: Medium responses (default)
   * - 2048: Longer, more detailed responses
   */
  maxTokens: 1024,

  // ============================================
  // Rate Limiting
  // ============================================

  /**
   * Maximum requests allowed per time window.
   * Prevents abuse and controls costs.
   */
  rateLimit: {
    /** Number of requests allowed */
    maxRequests: 10,
    
    /** Time window in seconds */
    windowSeconds: 60,
  },

  // ============================================
  // Conversation Settings
  // ============================================

  /**
   * How long before a conversation is considered "new" (in milliseconds).
   * Messages within this window are grouped into the same conversation.
   * Default: 1 hour (3600000ms)
   */
  conversationTimeoutMs: 3600000,
}
