# Automation Workflow

Task 3 delivery: an n8n workflow for handling a new property or sales lead from a webhook, validating it, saving it, classifying it as `hot / warm / cold`, notifying the team when urgent, and returning one customer acknowledgement.

The importable workflow currently lives at:

```text
./automation/workflow.json
```

It is integrated with the Graspia handover flow because that is the most realistic source of leads in this project bundle.

## Why n8n

n8n is a good fit here because the workflow needs to be visible to non-developers. The webhook, validation, storage, classification, notification, and final response are separate nodes that can be inspected without reading the app code.

## Flow Summary

1. `Receive Lead Webhook` accepts lead JSON.
2. `AI Validate Lead` rejects spam, empty submissions, fake-looking contact details, and missing contact methods.
3. `Save Lead to Database Best Effort` posts the lead to the Graspia app's `/api/automation/lead` endpoint.
4. `AI Classify Lead` scores the lead as `hot`, `warm`, or `cold`.
5. `Hot Lead?` branches urgent leads.
6. `Send Telegram Hot Lead Alert` notifies the team for hot leads.
7. The workflow returns an acknowledgement payload for the customer.

Telegram was the easiest notification channel for this take-home because a bot token is quick to obtain and does not require the same business verification setup that WhatsApp or LINE usually need for production messaging. That keeps the demo lightweight while still exercising the urgent handover path.

## Environment

Copy `.env.n8n.example` to `.env.n8n` for local Docker or n8n configuration.

```bash
OPENAI_API_KEY=
GRASPIA_APP_BASE_URL=http://host.docker.internal:3000
N8N_BLOCK_ENV_ACCESS_IN_NODE=false
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
```

Important: `.env.n8n` must contain local secrets only and should not be committed with real values. Any exposed OpenAI or Telegram token should be revoked and regenerated.

## Webhook Input

```json
{
  "conversationId": "demo-123",
  "preferredLanguage": "en",
  "name": "Anan",
  "phone": "0812345678",
  "email": "anan@example.com",
  "message": "I am ready to move forward with the 5kW package",
  "budget": "185000 THB",
  "area": "Bangkok",
  "handover": {
    "handover": true,
    "reason": "ready_to_buy",
    "summary": "Customer is ready to buy and shared contact details.",
    "confidence": 0.97
  }
}
```

## Workflow Output

```json
{
  "accepted": true,
  "rejected": false,
  "tier": "hot",
  "reasoning": "The customer is at close stage and needs immediate follow-up.",
  "autoReply": "Thanks for the details. Our team will review everything and follow up soon with the next step.",
  "notifyUrgent": true,
  "notificationSent": true,
  "notificationChannel": "telegram",
  "validationReason": null,
  "leadRecordId": "..."
}
```

## Real-World Judgment

- Validation: the workflow rejects missing contact details, fake-looking names, repeated fake phone digits, spam URLs, casino/crypto/loan content, and too-short messages.
- AI fallback: if OpenAI is unavailable, local heuristics still validate and classify the lead so the workflow keeps moving.
- Storage failures: database writes are best effort and captured in the returned automation object. A storage outage should not block urgent notification.
- Duplicates: the app endpoint deduplicates by normalized email first, then phone, then conversation id.
- Notification failures: Telegram notification uses `continueOnFail`, and the returned payload marks `notificationChannel` as `telegram-failed` if the send fails.
- Human handover: hot leads and close moments should alert a human immediately; warm and cold leads are saved without urgent interruption.

## Reliability Plan

The current demo includes bounded retries for the fragile external calls, but it does not include a durable dead-letter queue yet.

- Retries: OpenAI validation/classification/acknowledgement calls retry twice, lead database save retries three times, and the Telegram HTTP node retries three times. Retry waits start at 2000ms.
- Failures: after retries are exhausted, the workflow catches database save errors, falls back to local AI heuristics, and uses `continueOnFail` for Telegram so the customer still receives an acknowledgement.
- Duplicate leads: `/api/automation/lead` upserts by `dedupe_key`, using normalized email first, phone second, and `conversation_id` as the fallback.
- Idempotency: production webhooks should include a stable event id so a retried webhook updates the same lead instead of creating another record.
- Operations: for production, failed saves, failed notifications, and rejected leads should appear in a simple monitoring dashboard or alert channel. Failed jobs should move to a dead-letter view after the retry limit.

## How To Run

1. Start the Graspia app in `../02-graspia-agent`.
2. Start n8n and enable Code node environment access.
3. Import `../03-automation/automation/workflow.json`.
4. Set the n8n environment variables from `.env.n8n`.
5. Activate the workflow and use its webhook URL as `NOTIFY_WEBHOOK_URL` in the Graspia app.

### Run n8n with Docker on Windows PowerShell

Create the Docker-managed volume once:

```powershell
docker volume create n8n_data
```

Run n8n with the local timezone, tunnel enabled, and the project env file:

```powershell
docker run -it --rm `
  --name n8n `
  -p 5678:5678 `
  --env-file D:\interview-whattheproperty\project_list\03-automation\.env.n8n `
  -e GENERIC_TIMEZONE="Asia/Bangkok" `
  -e TZ="Asia/Bangkok" `
  -e N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS=true `
  -e N8N_RUNNERS_ENABLED=true `
  -e N8N_TUNNEL=true `
  -v n8n_data:/home/node/.n8n `
  docker.n8n.io/n8nio/n8n
```

The tunnel URL is useful for testing webhooks from external services. For local Graspia-to-n8n testing, `http://localhost:5678` is enough.


