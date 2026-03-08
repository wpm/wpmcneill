#!/usr/bin/env node

/**
 * Generate Embeddings Script
 *
 * Generates Voyage AI embeddings for all posts that have a null embedding.
 *
 * Usage: node scripts/generate-embeddings.js
 *
 * Requires environment variables:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 *   VOYAGE_API_KEY
 */

const VOYAGE_MODEL = 'voyage-3'
const BATCH_SIZE = 10
const RETRY_DELAY_MS = 20000 // 20s between retries on rate limit
const MAX_RETRIES = 3

async function generateEmbedding(text, apiKey, retries = MAX_RETRIES) {
  const response = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: VOYAGE_MODEL,
      input: text,
      input_type: 'document',
    }),
  })

  if (response.status === 429 && retries > 0) {
    process.stdout.write(`rate limited, waiting ${RETRY_DELAY_MS / 1000}s... `)
    await new Promise((r) => setTimeout(r, RETRY_DELAY_MS))
    return generateEmbedding(text, apiKey, retries - 1)
  }

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Voyage API error: ${response.status} ${err}`)
  }

  const data = await response.json()
  return data.data[0].embedding
}

async function generateEmbeddings() {
  const voyageApiKey = process.env.VOYAGE_API_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!voyageApiKey) {
    console.error('Missing VOYAGE_API_KEY')
    process.exit(1)
  }
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables.')
    process.exit(1)
  }

  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(supabaseUrl, supabaseKey)

  const { data: posts, error } = await supabase.from('posts').select('id, title, content').is('embedding', null)

  if (error) {
    console.error('Error fetching posts:', error.message)
    process.exit(1)
  }

  if (!posts || posts.length === 0) {
    console.log('No posts need embeddings.')
    return
  }

  console.log(`Generating embeddings for ${posts.length} posts...`)

  let success = 0
  let failed = 0

  for (let i = 0; i < posts.length; i += BATCH_SIZE) {
    const batch = posts.slice(i, i + BATCH_SIZE)

    for (const post of batch) {
      try {
        process.stdout.write(`  [${i + batch.indexOf(post) + 1}/${posts.length}] "${post.title}"... `)
        const text = `${post.title}\n\n${post.content}`
        const embedding = await generateEmbedding(text, voyageApiKey)

        const { error: updateError } = await supabase.from('posts').update({ embedding }).eq('id', post.id)

        if (updateError) {
          console.log(`FAILED: ${updateError.message}`)
          failed++
        } else {
          console.log('ok')
          success++
        }
      } catch (err) {
        console.log(`FAILED: ${err.message}`)
        failed++
      }
    }
  }

  console.log('')
  console.log(`Done: ${success} succeeded, ${failed} failed.`)
}

generateEmbeddings()
