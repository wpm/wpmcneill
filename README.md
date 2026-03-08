# Bill McNeill Personal Site

Personal website with Steph, an AI FAQ assistant.

## Quick Start

1. Connect Supabase integration in v0
2. Run `supabase db push` to apply the schema
3. Deploy

## Configuration

All settings are configured via environment variables. Set these in your Vercel project settings under **Vars**.

| Variable                          | Default              | Description                               |
| --------------------------------- | -------------------- | ----------------------------------------- |
| `STEPH_MODEL`                     | `openai/gpt-4o-mini` | LLM model to use                          |
| `STEPH_TEMPERATURE`               | `7`                  | Response randomness (0-20, divided by 10) |
| `STEPH_MAX_TOKENS`                | `1024`               | Max tokens per response                   |
| `STEPH_RATE_LIMIT_MAX`            | `10`                 | Requests allowed per window               |
| `STEPH_RATE_LIMIT_WINDOW_SECONDS` | `60`                 | Rate limit window in seconds              |
| `STEPH_CONVERSATION_TIMEOUT_MS`   | `3600000`            | Conversation grouping timeout (1 hour)    |

### Model Options

```
openai/gpt-4o-mini              # Fast, cheap (default)
openai/gpt-4o                   # Smarter, more expensive
openai/gpt-5-mini               # Latest mini model
anthropic/claude-sonnet-4-20250514  # Claude Sonnet
anthropic/claude-opus-4.6       # Claude Opus (most capable)
google/gemini-3-flash           # Fast Google model
```

### Preview vs Production

Set different values per environment in Vercel:

**Preview:** Cheaper model, relaxed rate limiting for testing

```
STEPH_MODEL = openai/gpt-4o-mini
STEPH_RATE_LIMIT_MAX = 100
```

**Production:** Better model, strict rate limiting

```
STEPH_MODEL = openai/gpt-4o
STEPH_RATE_LIMIT_MAX = 10
```

## Substack Ingestion

Steph can reference your Substack posts. To import them:

### 1. Export from Substack

1. Go to your Substack dashboard
2. Settings → Export → Download
3. Save the ZIP file (contains `posts.csv` and `posts/` directory with HTML files)

### 2. Run the Import Script

```bash
pnpm run import-substack path/to/your-substack-export.zip
```

The script:

- Extracts the ZIP to a temp directory
- Parses post metadata from `posts.csv`
- Reads full content from HTML files in `posts/`
- Stores everything in Supabase

### 3. Re-import When Needed

Run the same script after publishing new posts. It will update existing posts and add new ones.

## Customizing Steph

Steph's personality and knowledge are defined in modular prompt files:

```
lib/prompts/
├── index.ts        # Assembles all prompts
├── personality.ts  # Voice and communication style
├── facts.ts        # What Steph knows about you
└── guardrails.ts   # Handling limitations and sensitive topics
```

Edit these files to change how Steph responds. Add new files for additional context (e.g., `substack-highlights.ts`) and import them in `index.ts`.

## Database Schema

Three main tables:

- **conversations** - Chat sessions (id, client_ip, created_at)
- **messages** - Individual messages (conversation_id, role, content, timestamp)
- **posts** - Substack content with vector embeddings for semantic search

## Viewing Conversation Logs

All conversations are logged to Supabase. View them in your Supabase dashboard under the `conversations` and `messages` tables.
