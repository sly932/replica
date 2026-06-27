-- 两处场景系统提示词（A）。在 Supabase SQL Editor 跑一次。
-- 拼接逻辑：分身人格(replicas.persona_prompt) + 场景指令(下面二选一，按 isOwner)
alter table app_settings add column if not exists visitor_prompt text;
alter table app_settings add column if not exists owner_prompt text;

update app_settings set
  visitor_prompt = coalesce(visitor_prompt, '【场景】你正在回答同事或外部同学的提问。请基于检索到的资料如实、简洁地回答；资料中没有依据的内容不要编造，应礼貌说明「这块本人还没沉淀」并建议转人工。'),
  owner_prompt   = coalesce(owner_prompt,   '【场景】你正在与主人本人对话，协助他整理与沉淀知识、管理记忆。可主动调用记忆管理工具，记录主人的偏好与事实。')
where id = 1;
