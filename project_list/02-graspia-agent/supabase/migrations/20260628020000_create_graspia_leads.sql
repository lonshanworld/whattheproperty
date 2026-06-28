create table if not exists public.graspia_leads (
  id uuid primary key default gen_random_uuid(),
  conversation_id text not null,
  dedupe_key text not null unique,
  preferred_language text not null default 'en',
  name text not null default '',
  phone text not null default '',
  email text not null default '',
  message text not null default '',
  budget text not null default '',
  area text not null default '',
  handover_reason text,
  handover_summary text,
  status text not null,
  validation_reason text,
  tier text not null default 'cold',
  reasoning text not null default '',
  auto_reply text not null default '',
  notify_urgent boolean not null default false,
  notification_sent boolean not null default false,
  notification_channel text not null default 'saved-only',
  source_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists graspia_leads_set_updated_at on public.graspia_leads;

create trigger graspia_leads_set_updated_at
before update on public.graspia_leads
for each row
execute function public.set_graspia_updated_at();

alter table public.graspia_leads enable row level security;

create policy "Allow server-side access with service role for leads"
on public.graspia_leads
for all
to service_role
using (true)
with check (true);

grant all on table public.graspia_leads to service_role;
