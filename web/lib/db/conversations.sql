-- 会话列表标题（B-L2 持久化）。在 Supabase SQL Editor 跑一次。
alter table conversations add column if not exists title text;
