-- ============================================================
-- Replica · Supabase schema (D1)
-- 在 Supabase SQL Editor 直接整段运行。
-- 向量维度默认 1536（OpenAI text-embedding-3-small / 多数中转兼容）；
-- 若 embedding 模型维度不同，改所有 vector(1536) 后再跑。
-- ============================================================

create extension if not exists vector;
create extension if not exists pg_trgm;   -- 关键词/BM25 近似(全文 + 三元组)

-- 分身
create table if not exists replicas (
  id            uuid primary key default gen_random_uuid(),
  owner_user_id uuid,
  name          text not null,
  mis_id        text unique,
  role          text,
  org           text,
  team          text,
  persona_prompt text,
  gender        text,
  bio           text,
  hobbies       text[],
  mbti          text,
  created_at    timestamptz default now()
);

-- 文章原文
create table if not exists articles (
  id          uuid primary key default gen_random_uuid(),
  replica_id  uuid references replicas(id) on delete cascade,
  title       text,
  content     text,
  source_url  text,
  status      text default 'enabled',
  created_at  timestamptz default now()
);

-- RAG 向量块（Contextual Retrieval：embed(context + chunk_text)）
create table if not exists chunks (
  id          uuid primary key default gen_random_uuid(),
  article_id  uuid references articles(id) on delete cascade,
  replica_id  uuid references replicas(id) on delete cascade,
  chunk_text  text,
  context     text,                 -- 上下文化前缀（同时用于 contextual embedding 与 BM25）
  embedding   vector(1536),
  idx         int
);

-- 记忆（语义/情景）；delete=软删(deleted)，不软失效
create table if not exists memories (
  id           uuid primary key default gen_random_uuid(),
  replica_id   uuid references replicas(id) on delete cascade,
  kind         text check (kind in ('semantic','episodic')),
  content      text,
  source_qa_id uuid,                -- 溯源到产生它的那轮问答
  embedding    vector(1536),
  enabled      boolean default true,
  deleted      boolean default false,
  created_at   timestamptz default now()
);

-- 会话（情景记忆载体：summary 向量化）
create table if not exists conversations (
  id                uuid primary key default gen_random_uuid(),
  replica_id        uuid references replicas(id) on delete cascade,
  asker_id          uuid,
  direction         text check (direction in ('ask_me','i_ask')),
  summary           text,
  summary_embedding vector(1536),
  created_at        timestamptz default now()
);

-- 消息
create table if not exists messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade,
  role            text,
  content         text,
  images          jsonb,
  created_at      timestamptz default now()
);

-- 知识条目（统一表，含待回答；向量化与 chunks 一起进 searchKnowledge）
create table if not exists knowledge_items (
  id          uuid primary key default gen_random_uuid(),
  replica_id  uuid references replicas(id) on delete cascade,
  question    text,
  answer      text,
  embedding   vector(1536),
  source      text check (source in ('human','reasoning')),
  status      text check (status in ('pending_answer','pending_review','approved','archived')) default 'pending_answer',
  deleted     boolean default false,
  created_at  timestamptz default now()
);

-- ===== 向量索引（ivfflat，余弦） =====
create index if not exists idx_chunks_vec    on chunks            using ivfflat (embedding vector_cosine_ops);
create index if not exists idx_mem_vec       on memories          using ivfflat (embedding vector_cosine_ops);
create index if not exists idx_conv_vec      on conversations     using ivfflat (summary_embedding vector_cosine_ops);
create index if not exists idx_know_vec      on knowledge_items   using ivfflat (embedding vector_cosine_ops);

-- ===== 关键词/BM25 近似索引（pg_trgm gin） =====
create index if not exists idx_chunks_trgm   on chunks          using gin (context gin_trgm_ops);
create index if not exists idx_know_trgm     on knowledge_items using gin (question gin_trgm_ops);
create index if not exists idx_conv_trgm     on conversations   using gin (summary gin_trgm_ops);

-- ===== Storage =====
-- 在 Supabase 控制台建一个 public bucket：chat-images（多模态图片）
