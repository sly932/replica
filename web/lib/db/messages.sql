-- 消息表存工具调用（工具展示 & 持久化）。在 Supabase SQL Editor 跑一次。
alter table messages add column if not exists tool_calls jsonb;
