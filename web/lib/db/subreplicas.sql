-- 子分身 schema 补丁：给 replicas 增加 parent_id（指向父分身）
-- 在 Supabase SQL Editor 里执行一次即可（幂等）。
alter table replicas add column if not exists parent_id uuid references replicas(id) on delete set null;
