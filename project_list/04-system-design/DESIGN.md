# Task 4 - System Design

## 1. Graspia at scale

- Store each business as its own tenant.
- Keep business data in separate tables:
  - `businesses` for name, tone, languages, and settings
  - `business_products` for package details
  - `business_rules` for things the AI must or must not say
  - `business_documents` for FAQ and policy content
- When a chat comes in, identify the business first from the channel, webhook, or API key, then load only that business's data.
- Put `business_id` on every conversation, lead, message, document, cache entry, and embedding row so one business cannot see another business's data.
- Keep AI cost down by:
  - using simple rule checks before calling AI
  - summarizing long chats
  - caching common answers per business
  - sending only the most relevant business info and the latest messages to the model

```text
Client -> Channel/Webhook -> Tenant Resolver -> Knowledge + Policy Fetch
                                      -> AI Orchestrator -> Reply / Handover
                                      -> Event Log + Lead Queue
```

## 2. Reliability

- If the AI API is slow or down:
  - use a short timeout and retry a small number of times
  - if it still fails, show a safe message like "We're checking this with a human team member now."
  - create a handover or fallback event so the chat does not get stuck
- To make sure no lead or message is lost:
  - save inbound messages first, before AI processing
  - use idempotency keys for webhooks and lead saves so retries update the same record
  - queue CRM writes and notifications, retry them, and send repeated failures to a dead-letter view
  - keep conversation state separate from raw message history so one bad update does not erase the transcript

## 3. Human handover in the real world

- If a human is busy and does not pick up for 10 minutes:
  - mark the handover as `unassigned_over_sla`
  - tell the customer the request is queued and a human is delayed
  - send it to another rep, team, or manager queue
  - do not let the bot resume high-risk advice after handover
- Track handover with a simple state machine:
  - `bot_active -> handover_requested -> assigned -> human_active -> resolved`
  - Extra states: `waiting_customer`, `unassigned_over_sla`, `closed`
- The handover queue should show business, customer contact, priority, reason, SLA timer, assigned human, summary, and notification status.

## 4. My first 2 weeks

- First, fix the data foundation:
  - move Graspia from one hardcoded `business-profile.json` to tenant-aware database tables
  - add append-only message or event logging beside the current conversation snapshot
  - add handover ownership, SLA fields, and `business_id` everywhere
- Second, reduce AI cost and hallucination risk:
  - property matching: pre-filter listings by hard constraints before AI ranking
  - Graspia: separate handover and intent classification from answer generation
  - add tenant-aware caching and conversation summarization
- Third, improve reliability and visibility:
  - add a dead-letter view for n8n failures after retry limits
  - track handover rate, AI fallback rate, notification failure rate, and token cost
  - add tests for angry user, unknown question, close intent, repeated loop, jailbreak attempt, AI outage, and duplicate lead

Why these first:

- Project 1 already proves the matching flow, but it still sends all listings to AI and only uses in-memory cache.
- Project 2 already has handover, logging, deduped leads, and n8n automation, but it is still single-tenant and snapshot-based.
- The biggest practical wins are tenant isolation, durable event logging, lower AI cost, and a clearer handover workflow for humans.
