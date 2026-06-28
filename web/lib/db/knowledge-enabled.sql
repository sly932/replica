-- 知识条目「是否生效」开关：approved 条目可被 toggle 关闭，关闭后不参与检索。
-- 在 Supabase SQL Editor 跑一次。已有 approved 条目默认 enabled=true，检索不受影响。

-- 1) 加 enabled 列（默认 true，向后兼容）
alter table knowledge_items add column if not exists enabled boolean default true;

-- 2) 向量检索 RPC 增加 enabled 过滤（关闭的条目不再召回）
create or replace function match_knowledge(
  p_replica_id uuid,
  query_embedding vector(1536),
  match_count int default 8
) returns table (id uuid, question text, answer text, status text, similarity float)
language sql stable as $$
  select id, question, answer, status,
         1 - (embedding <=> query_embedding) as similarity
  from knowledge_items
  where replica_id = p_replica_id and not deleted and status = 'approved' and enabled
  order by embedding <=> query_embedding
  limit match_count;
$$;
