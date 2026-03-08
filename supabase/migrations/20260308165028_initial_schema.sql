-- Enable pgvector extension for semantic search
create extension if not exists vector;

-- Conversations table
create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  started_at timestamp with time zone default now(),
  ip_hash text, -- hashed IP for rate limiting (privacy-preserving)
  user_agent text,
  metadata jsonb default '{}'::jsonb
);

-- Messages table
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamp with time zone default now()
);

-- Posts table for Substack content with vector embeddings
create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  slug text unique,
  content text not null,
  url text,
  published_at timestamp with time zone,
  embedding vector(1536), -- OpenAI text-embedding-3-small dimension
  created_at timestamp with time zone default now()
);

-- Rate limiting table
create table if not exists rate_limits (
  ip_hash text primary key,
  request_count integer default 1,
  window_start timestamp with time zone default now()
);

-- Indexes for performance
create index if not exists idx_messages_conversation on messages(conversation_id);
create index if not exists idx_messages_created on messages(created_at);
create index if not exists idx_conversations_started on conversations(started_at);
create index if not exists idx_rate_limits_window on rate_limits(window_start);

-- Vector similarity search index
create index if not exists idx_posts_embedding on posts using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- Function for semantic search
create or replace function search_posts(
  query_embedding vector(1536),
  match_threshold float default 0.7,
  match_count int default 5
)
returns table (
  id uuid,
  title text,
  content text,
  url text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    posts.id,
    posts.title,
    posts.content,
    posts.url,
    1 - (posts.embedding <=> query_embedding) as similarity
  from posts
  where 1 - (posts.embedding <=> query_embedding) > match_threshold
  order by posts.embedding <=> query_embedding
  limit match_count;
end;
$$;
