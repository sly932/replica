-- 方案B：全局文档 + 分身引用。在 Supabase SQL Editor 跑一次。
-- 1) 分身-文档引用关联表（哪个分身引用了哪篇文档）
create table if not exists replica_kb (
  replica_id uuid references replicas(id) on delete cascade,
  article_id uuid references articles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (replica_id, article_id)
);
create index if not exists idx_replica_kb_replica on replica_kb(replica_id);

-- 2) 初始化：现有每篇文档默认由其创建者(articles.replica_id)引用，保证现有检索不变
insert into replica_kb (replica_id, article_id)
select replica_id, id from articles where replica_id is not null
on conflict do nothing;

-- 3) 按 article_ids 检索 chunks（方案B 检索：只搜"分身引用的文档"的向量；一篇文档全局只一份向量）
create or replace function match_chunks_by_articles(
  p_article_ids uuid[],
  query_embedding vector(1536),
  match_count int default 8
) returns table (id uuid, article_id uuid, chunk_text text, context text, similarity float)
language sql stable as $$
  select c.id, c.article_id, c.chunk_text, c.context,
         1 - (c.embedding <=> query_embedding) as similarity
  from chunks c
  where c.article_id = any(p_article_ids)
  order by c.embedding <=> query_embedding
  limit match_count;
$$;
