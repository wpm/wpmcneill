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
 * - posts/ directory (individual posts as HTML files named {post_id}.html)
 *
 * Requires environment variables:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

// Simple HTML to plain text conversion
function htmlToText(html) {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<\/(p|div|h[1-6]|li|tr|br)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n\s*\n/g, '\n\n')
    .trim()
}

// Parse a single CSV line handling quoted values with embedded commas/newlines
function parseCSVLine(line) {
  const values = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
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

// Parse full CSV content into array of objects
function parseCSV(content) {
  const lines = content.split('\n')
  if (lines.length === 0) return []

  const header = parseCSVLine(lines[0])
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

async function importSubstackPosts(zipPath) {
  const apiKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

  if (!apiKey || !supabaseUrl) {
    console.error('Missing Supabase environment variables.')
    console.error('Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY')
    process.exit(1)
  }

  const tempDir = path.join(process.cwd(), '.substack-import-temp')

  try {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true })
    }
    fs.mkdirSync(tempDir)

    console.log('Extracting ZIP file...')
    execSync(`unzip -q "${zipPath}" -d "${tempDir}"`)

    // posts.csv may be at the top level or inside a single subdirectory
    let csvPath = path.join(tempDir, 'posts.csv')
    let postsDir = path.join(tempDir, 'posts')
    if (!fs.existsSync(csvPath)) {
      const entries = fs.readdirSync(tempDir)
      const subdir = entries.find((e) => fs.statSync(path.join(tempDir, e)).isDirectory())
      if (subdir) {
        csvPath = path.join(tempDir, subdir, 'posts.csv')
        postsDir = path.join(tempDir, subdir, 'posts')
      }
    }

    if (!fs.existsSync(csvPath)) {
      console.error('posts.csv not found in ZIP')
      process.exit(1)
    }

    const csvContent = fs.readFileSync(csvPath, 'utf-8')
    const allPosts = parseCSV(csvContent)

    // Only import published posts
    const posts = allPosts.filter((p) => p.is_published === 'true')
    console.log(`Found ${posts.length} published posts out of ${allPosts.length} total`)

    if (posts.length === 0) {
      console.log('No published posts to import.')
      return
    }

    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(supabaseUrl, apiKey)

    let imported = 0
    let skipped = 0

    for (const post of posts) {
      try {
        const title = post.title || 'Untitled'
        const subtitle = post.subtitle || null

        // post_id is "{numeric_id}.{slug}", e.g. "190009175.a-socratic-dialog-with-claude-code"
        const postId = post.post_id || ''
        const dotIndex = postId.indexOf('.')
        const slug = dotIndex !== -1 ? postId.slice(dotIndex + 1) : postId
        const url = slug ? `https://wpmcneill.substack.com/p/${slug}` : ''
        const publishedAt = post.post_date || null

        // HTML file is named {post_id}.html
        let content = ''
        const htmlPath = path.join(postsDir, `${postId}.html`)
        if (fs.existsSync(htmlPath)) {
          const htmlContent = fs.readFileSync(htmlPath, 'utf-8')
          content = htmlToText(htmlContent)
        }

        if (!content || content.length < 10) {
          console.log(`Skipping "${title}" — no HTML content found`)
          skipped++
          continue
        }

        console.log(`Importing: "${title}"`)

        const { data: existing } = await supabase
          .from('posts')
          .select('id')
          .eq('slug', slug)
          .single()

        const record = { title, subtitle, content, url, slug, published_at: publishedAt }

        if (existing) {
          const { error } = await supabase.from('posts').update(record).eq('id', existing.id)

          if (error) {
            console.error(`  Error updating: ${error.message}`)
          } else {
            console.log(`  Updated`)
            imported++
          }
        } else {
          const { error } = await supabase.from('posts').insert({ ...record, embedding: null })

          if (error) {
            console.error(`  Error inserting: ${error.message}`)
          } else {
            console.log(`  Inserted`)
            imported++
          }
        }
      } catch (err) {
        console.error(`  Error processing post: ${err.message}`)
      }
    }

    console.log('')
    console.log(`Import complete: ${imported} imported, ${skipped} skipped.`)
  } finally {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true })
    }
  }
}

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
