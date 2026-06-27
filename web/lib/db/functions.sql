-- ============================================================
-- Replica · 向量检索 RPC 函数
-- 在 schema.sql 之后，于 Supabase SQL Editor 整段运行。
-- supabase-js 不能直接做 pgvector 相似度查询，统一走这些 RPC（supabase.rpc(...)）。
-- 关键词/BM25 近似在 lib 层用 pg_trgm（ilike / similarity）做，再与向量 RRF 融合。
-- 维度 1536，与 schema 一致。
-- ============================================================

-- 文档块检索（Contextual Retrieval：embed(context+chunk_text)）
create or replace function match_chunks(
  p_replica_id uuid,
  query_embedding vector(1536),
  match_count int default 8
) returns table (id uuid, article_id uuid, chunk_text text, context text, similarity float)
language sql stable as $$
  select id, article_id, chunk_text, context,
         1 - (embedding <=> query_embedding) as similarity
  from chunks
  where replica_id = p_replica_id
  order by embedding <=> query_embedding
  limit match_count;
$$;

-- 知识条目检索（只召回已通过、未删的）
create or replace function match_knowledge(
  p_replica_id uuid,
  query_embedding vector(1536),
  match_count int default 8
) returns table (id uuid, question text, answer text, status text, similarity float)
language sql stable as $$
  select id, question, answer, status,
         1 - (embedding <=> query_embedding) as similarity
  from knowledge_items
  where replica_id = p_replica_id and not deleted and status = 'approved'
  order by embedding <=> query_embedding
  limit match_count;
$$;

-- 记忆检索（语义/情景；enabled 且未删）
create or replace function match_memories(
  p_replica_id uuid,
  query_embedding vector(1536),
  match_count int default 8,
  p_kind text default null
) returns table (id uuid, kind text, content text, similarity float)
language sql stable as $$
  select id, kind, content,
         1 - (embedding <=> query_embedding) as similarity
  from memories
  where replica_id = p_replica_id and enabled and not deleted
    and (p_kind is null or kind = p_kind)
  order by embedding <=> query_embedding
  limit match_count;
$$;

-- 会话检索（情景记忆：summary 向量 + 可选时间窗）
create or replace function match_conversations(
  p_replica_id uuid,
  query_embedding vector(1536),
  match_count int default 5,
  p_after timestamptz default null,
  p_before timestamptz default null
) returns table (id uuid, summary text, created_at timestamptz, similarity float)
language sql stable as $$
  select id, summary, created_at,
         1 - (summary_embedding <=> query_embedding) as similarity
  from conversations
  where replica_id = p_replica_id
    and (p_after is null or created_at >= p_after)
    and (p_before is null or created_at <= p_before)
  order by summary_embedding <=> query_embedding
  limit match_count;
$$;
