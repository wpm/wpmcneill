#!/usr/bin/env node

/**
 * Substack Import Script
 * 
 * Usage: node scripts/import-substack.js <path-to-substack-export.zip>
 * 
 * To get your Substack export:
 * 1. Go to your Substack dashboard
 * 2. Settings → Export → Download
 * 3. Run this script with the downloaded ZIP file
 * 
 * The ZIP contains:
 * - posts.csv (metadata for all posts)
 * - posts/ directory (individual posts as HTML files)
 * 
 * This script:
 * - Extracts and parses the ZIP
 * - Reads post metadata from posts.csv
 * - Extracts content from HTML files
 * - Stores them in Supabase for Steph to reference
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

// Simple HTML to plain text conversion
function htmlToText(html) {
  return html
    // Remove script and style tags with content
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    // Convert common block elements to newlines
    .replace(/<\/(p|div|h[1-6]|li|tr|br)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    // Remove remaining HTML tags
    .replace(/<[^>]+>/g, '')
    // Decode common HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // Clean up whitespace
    .replace(/\n\s*\n/g, '\n\n')
    .trim()
}

// Parse CSV (simple parser for Substack format)
function parseCSV(content) {
  const lines = content.split('\n')
  if (lines.length === 0) return []

  // Parse header
  const header = parseCSVLine(lines[0])
  
  // Parse rows
  const rows = []
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '') continue
    const values = parseCSVLine(lines[i])
    const row = {}
    header.forEach((col, idx) => {
      row[col] = values[idx] || ''
    })
    rows.push(row)
  }
  return rows
}

// Parse a single CSV line (handles quoted values)
function parseCSVLine(line) {
  const values = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++ // Skip next quote
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current)
      current = ''
    } else {
      current += char
    }
  }
  values.push(current)
  
  return values
}

async function importSubstackPosts(zipPath) {
  const apiKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

  if (!apiKey || !supabaseUrl) {
    console.error('Missing Supabase environment variables.')
    console.error('Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY')
    process.exit(1)
  }

  // Create temp directory for extraction
  const tempDir = path.join(process.cwd(), '.substack-import-temp')
  
  try {
    // Clean up any previous temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true })
    }
    fs.mkdirSync(tempDir)

    // Extract ZIP
    console.log('Extracting ZIP file...')
    execSync(`unzip -q "${zipPath}" -d "${tempDir}"`)

    // Find posts.csv
    const csvPath = path.join(tempDir, 'posts.csv')
    if (!fs.existsSync(csvPath)) {
      console.error('posts.csv not found in ZIP')
      process.exit(1)
    }

    // Parse CSV
    const csvContent = fs.readFileSync(csvPath, 'utf-8')
    const posts = parseCSV(csvContent)

    if (posts.length === 0) {
      console.error('No posts found in posts.csv')
      process.exit(1)
    }

    console.log(`Found ${posts.length} posts to import`)

    // Find posts directory
    const postsDir = path.join(tempDir, 'posts')
    const hasPostsDir = fs.existsSync(postsDir)

    // Import Supabase client
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(supabaseUrl, apiKey)

    // Process each post
    let imported = 0
    let skipped = 0

    for (const post of posts) {
      try {
        const title = post.title || post.subject || 'Untitled'
        const slug = post.post_id || post.slug || ''
        const postDate = post.post_date || post.published_at || new Date().toISOString()
        
        // Build the Substack URL
        const url = slug 
          ? `https://wpmcneill.substack.com/p/${slug}`
          : ''

        // Try to read HTML content
        let content = post.subtitle || post.description || ''
        
        if (hasPostsDir && slug) {
          // Look for HTML file
          const htmlPath = path.join(postsDir, `${slug}.html`)
          if (fs.existsSync(htmlPath)) {
            const htmlContent = fs.readFileSync(htmlPath, 'utf-8')
            content = htmlToText(htmlContent)
          }
        }

        // Skip if no meaningful content
        if (!content || content.length < 10) {
          console.log(`Skipping "${title}" (no content)`)
          skipped++
          continue
        }

        console.log(`Importing: "${title}"`)

        // Check if post already exists
        const { data: existing } = await supabase
          .from('posts')
          .select('id')
          .eq('url', url)
          .single()

        if (existing) {
          // Update existing
          const { error } = await supabase
            .from('posts')
            .update({
              title,
              content,
              published_at: postDate,
            })
            .eq('id', existing.id)

          if (error) {
            console.error(`  Error updating: ${error.message}`)
          } else {
            console.log(`  Updated`)
            imported++
          }
        } else {
          // Insert new
          const { error } = await supabase.from('posts').insert({
            title,
            content,
            url,
            published_at: postDate,
            embedding: null,
          })

          if (error) {
            console.error(`  Error inserting: ${error.message}`)
          } else {
            console.log(`  Imported`)
            imported++
          }
        }
      } catch (error) {
        console.error(`  Error processing post: ${error.message}`)
      }
    }

    console.log('')
    console.log(`Import complete! ${imported} imported, ${skipped} skipped.`)

  } finally {
    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true })
    }
  }
}

// Get file path from command line args
const zipPath = process.argv[2]
if (!zipPath) {
  console.error('Usage: node scripts/import-substack.js <path-to-substack-export.zip>')
  process.exit(1)
}

if (!fs.existsSync(zipPath)) {
  console.error(`File not found: ${zipPath}`)
  process.exit(1)
}

importSubstackPosts(path.resolve(zipPath))
