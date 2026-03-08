-- Switch from OpenAI text-embedding-3-small (1536 dims) to Voyage voyage-3 (1024 dims)

-- Drop old index and function
drop index if exists idx_posts_embedding;
drop function if exists search_posts;

-- Resize embedding column
alter table posts alter column embedding type vector(1024);

-- Recreate vector index for new dimension
create index idx_posts_embedding on posts using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- Recreate search function with new dimension
create or replace function search_posts(
  query_embedding vector(1024),
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
