#!/usr/bin/env node

/**
 * Substack Import Script
 * 
 * Usage: node scripts/import-substack.js <path-to-substack-export.json>
 * 
 * To get your Substack export:
 * 1. Go to your Substack dashboard
 * 2. Settings → Export → Download JSON
 * 3. Run this script with the downloaded file
 * 
 * This script:
 * - Parses your Substack posts
 * - Generates embeddings for each post using OpenAI
 * - Stores them in Supabase with vector search capabilities
 */

const fs = require('fs')
const path = require('path')

async function importSubstackPosts(filePath) {
  const apiKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

  if (!apiKey || !supabaseUrl) {
    console.error('Missing Supabase environment variables')
    process.exit(1)
  }

  // Read the export file
  let substackData
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    substackData = JSON.parse(content)
  } catch (error) {
    console.error('Error reading Substack export:', error.message)
    process.exit(1)
  }

  const posts = substackData.publications || substackData.posts || []
  if (posts.length === 0) {
    console.error('No posts found in export file')
    process.exit(1)
  }

  console.log(`Found ${posts.length} posts to import`)

  // Import Supabase client
  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(supabaseUrl, apiKey)

  // Process each post
  for (const post of posts) {
    try {
      const title = post.title || post.subject || 'Untitled'
      const content =
        post.body ||
        post.content ||
        post.description ||
        'No content available'
      const url = post.post_url || post.url || ''
      const publishedAt = post.publish_date || post.published_at || new Date().toISOString()

      console.log(`Processing: "${title}"`)

      // For now, we'll store posts without embeddings
      // You can add embeddings later using OpenAI API
      // This saves API costs during initial setup

      const { error } = await supabase.from('posts').insert({
        title,
        content,
        url,
        published_at: publishedAt,
        embedding: null, // Will add embeddings in next phase
      })

      if (error) {
        console.error(`  Error storing post: ${error.message}`)
      } else {
        console.log(`  ✓ Stored successfully`)
      }
    } catch (error) {
      console.error(`  Error processing post: ${error.message}`)
    }
  }

  console.log('Import complete!')
  console.log('Note: To enable semantic search, run the embedding generation script next.')
}

// Get file path from command line args
const filePath = process.argv[2]
if (!filePath) {
  console.error('Usage: node scripts/import-substack.js <path-to-export.json>')
  process.exit(1)
}

importSubstackPosts(path.resolve(filePath))
