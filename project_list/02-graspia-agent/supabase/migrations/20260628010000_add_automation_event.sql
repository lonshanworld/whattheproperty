alter table public.graspia_conversations
add column if not exists automation_event jsonb;
