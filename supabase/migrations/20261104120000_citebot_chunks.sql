-- CiteBot chunk store for Supabase Postgres.
-- Preview runs without this database. Apply it when a Supabase project exists.
-- Do not insert an upload collection row. Uploaded PDFs stay in process memory.

create extension if not exists vector;

create table if not exists citebot_chunks (
  id text primary key,
  collection text not null,
  source text not null,
  title text not null,
  heading_path text[] not null default '{}',
  lang text,
  text text not null,
  index_text text not null,
  context text not null,
  context_source text not null,
  embedding vector(1024),
  tsv tsvector generated always as (to_tsvector('simple', index_text)) stored,
  constraint citebot_chunks_collection_check check (collection in ('handbook', 'phone'))
);

create index if not exists citebot_chunks_tsv on citebot_chunks using gin (tsv);
create index if not exists citebot_chunks_embedding on citebot_chunks using hnsw (embedding vector_cosine_ops);
create index if not exists citebot_chunks_collection on citebot_chunks (collection);
