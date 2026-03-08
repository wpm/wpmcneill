// Assembles all prompt modules into Steph's complete system prompt
// Edit the individual files to customize Steph's behavior

import { personality } from './personality'
import { facts } from './facts'
import { guardrails } from './guardrails'

export function buildSystemPrompt(contextFromPosts?: string): string {
  const sections = [personality, facts, guardrails]

  // If we have relevant Substack content, include it
  if (contextFromPosts) {
    sections.push(
      `
RELEVANT CONTENT FROM BILL'S SUBSTACK:
${contextFromPosts}

When answering, reference these posts naturally if relevant. Include links when citing specific articles.
`.trim()
    )
  }

  return sections.join('\n\n---\n\n')
}

// Re-export individual modules for direct access if needed
export { personality } from './personality'
export { facts } from './facts'
export { guardrails } from './guardrails'
