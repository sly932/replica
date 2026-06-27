alter table conversations add column if not exists model text;
alter table conversations add column if not exists context_used int;
alter table conversations add column if not exists context_total int;
