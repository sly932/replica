-- 全局应用设置（单行）。在 Supabase SQL Editor 运行一次。
-- 系统设置页（F9）读写这里：默认聊天模型 + RAG contextual 用的 summary 模型。
create table if not exists app_settings (
  id            int primary key default 1,
  chat_model    text,
  summary_model text,
  updated_at    timestamptz default now()
);

insert into app_settings (id, chat_model, summary_model)
values (1, 'anthropic/claude-sonnet-4.6', 'anthropic/claude-haiku-4.5')
on conflict (id) do nothing;
