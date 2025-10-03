-- Create agent_thread_state table for persistent conversation state
create table if not exists agent_thread_state (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references automation_threads(id) on delete cascade,
  user_id uuid not null,
  last_intent text,                   -- e.g., "create_automation"
  platform text,                      -- e.g., "airtable"
  action text,                        -- e.g., "delete_random_record"
  tool_id uuid,                       -- tool_definitions.id if selected
  awaiting_credentials boolean default false,
  required_fields jsonb,              -- e.g., ["personal_access_token","base_id","table_name"]
  plan_snapshot jsonb,                -- copy of analysis/tools used to build plan
  updated_at timestamptz default now(),
  unique(thread_id, user_id)
);

-- RLS
alter table agent_thread_state enable row level security;

create policy "Users only see their own thread state" on agent_thread_state
  for all using (auth.uid() = user_id);

create index if not exists idx_agent_thread_state_thread on agent_thread_state(thread_id);
