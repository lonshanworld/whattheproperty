# Database Design Notes

This file is a support note for the implemented database structures in projects 01 and 02. The actual Task 4 answer stays in `DESIGN.md`.

## Project 01 - Property Matching

Current implementation: PostgreSQL through `pg`, with the table created and seeded by `lib/db.ts`.

```sql
listings (
  id text primary key,
  title text not null,
  city text not null,
  area text not null,
  price integer not null,
  bedrooms integer not null,
  bathrooms integer not null,
  size_sqm integer not null,
  type text not null,
  near_transit text not null,
  furnished boolean not null,
  image text not null,
  description text not null
)
```

Current behavior:

- `GET /api/listings` filters by `city`, `maxPrice`, and `bedrooms`.
- Seed data from `data/listings.json` is upserted with `ON CONFLICT (id) DO UPDATE`.
- `POST /api/match` sends all listings to OpenAI, caches repeated requests in server process memory, and falls back to heuristic scoring if AI fails.

Production improvements:

- Add indexes on `LOWER(city)`, `price`, `bedrooms`, `type`, and possibly `area`.
- Add `listing_features` or JSONB metadata for amenities, transit distance, school access, beach/mountain tags, and investment tags.
- Add `buyer_requests` and `match_results` if the product needs audit logs, analytics, or human review.
- Add `created_at`, `updated_at`, and `source` for listing freshness and import tracking.
- Filter in SQL first and send only a shortlist to the LLM.

## Project 02 - Graspia Agent

Current implementation: Supabase/PostgreSQL through `@supabase/supabase-js`, with server-side writes using `SUPABASE_SERVICE_ROLE_KEY` when available.

```sql
graspia_conversations (
  id uuid primary key default gen_random_uuid(),
  conversation_id text not null unique,
  messages jsonb not null default '[]',
  escalated boolean not null default false,
  escalation_reason text,
  handover_summary text,
  handover_event jsonb,
  automation_event jsonb,
  lead jsonb,
  created_at timestamptz not null,
  updated_at timestamptz not null
)
```

```sql
graspia_leads (
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
  source_payload jsonb not null default '{}',
  created_at timestamptz not null,
  updated_at timestamptz not null
)
```

Current behavior:

- `POST /api/chat` logs one conversation snapshot with messages, escalation state, handover JSON, automation result, and extracted lead JSON.
- `POST /api/automation/lead` upserts leads by `dedupe_key`: normalized email first, normalized phone second, `conversation_id` last.
- n8n retries OpenAI calls, database save, and Telegram sends, then returns notification status such as `telegram`, `telegram-failed`, or `saved-only`.
- RLS is enabled and service-role-only policies are used for server-side access.

Production improvements:

- Keep `graspia_conversations` for current state, but add append-only `conversation_messages` or `conversation_events`.
- Add `businesses`, `business_products`, `business_rules`, and `business_documents` keyed by `business_id`.
- Add `handover_queue` with `conversation_id`, `business_id`, `reason`, `priority`, `status`, `assigned_to`, `requested_at`, `sla_due_at`, and `resolved_at`.
- Add `notification_attempts` or `automation_events` to store each Telegram/LINE/WhatsApp attempt, retry count, status, and error.
- Add `business_id` to every conversation, lead, message, handover, document, cache, and embedding row to prevent tenant data leakage.
