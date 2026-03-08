-- Fix column name mismatches between schema and API code

-- conversations: rename ip_hash -> client_ip, started_at -> created_at
alter table conversations rename column ip_hash to client_ip;
alter table conversations rename column started_at to created_at;

-- rate_limits: replace ip_hash primary key with client_ip, add created_at per-row timestamp
alter table rate_limits rename column ip_hash to client_ip;
alter table rate_limits drop column request_count;
alter table rate_limits drop column window_start;
alter table rate_limits add column created_at timestamp with time zone default now();
alter table rate_limits drop constraint rate_limits_pkey;
alter table rate_limits add column id uuid primary key default gen_random_uuid();

-- Update indexes
drop index if exists idx_conversations_started;
create index if not exists idx_conversations_created on conversations(created_at);

drop index if exists idx_rate_limits_window;
create index if not exists idx_rate_limits_created on rate_limits(created_at);
create index if not exists idx_rate_limits_client_ip on rate_limits(client_ip);
