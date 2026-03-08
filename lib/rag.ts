import { embed } from 'ai'
import { createVoyage } from 'voyage-ai-provider'
import { createClient } from '@/lib/supabase/server'
import { RAG_SIMILARITY_THRESHOLD } from '@/lib/config'

const MAX_POSTS = 3
const MAX_CONTENT_CHARS = 2000

const voyage = createVoyage({ apiKey: process.env.VOYAGE_API_KEY })

interface Post {
  id: string
  title: string
  content: string
  url: string
  similarity: number
}

/**
 * Retrieves Corner Cases posts relevant to the user's query using semantic search.
 * Returns a formatted string for injection into the system prompt, or null if nothing relevant found.
 */
export async function retrieveRelevantPosts(query: string): Promise<string | null> {
  try {
    const { embedding } = await embed({
      model: voyage.textEmbeddingModel('voyage-3'),
      value: query,
    })

    const supabase = await createClient()
    const { data: posts, error } = await supabase.rpc('search_posts', {
      query_embedding: embedding,
      match_threshold: RAG_SIMILARITY_THRESHOLD,
      match_count: MAX_POSTS,
    })

    if (error || !posts || posts.length === 0) {
      return null
    }

    return (posts as Post[])
      .map((post) => {
        const content =
          post.content.length > MAX_CONTENT_CHARS ? post.content.slice(0, MAX_CONTENT_CHARS) + '...' : post.content
        return `### ${post.title}\n${content}\n\nLink: ${post.url}`
      })
      .join('\n\n---\n\n')
  } catch (err) {
    // Fail gracefully — Steph still works without post context
    console.error('RAG retrieval error:', err)
    return null
  }
}
