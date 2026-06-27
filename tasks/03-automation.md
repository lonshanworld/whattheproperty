# Task 3 — Automation Workflow

**Goal:** Show you can build automation, not just app code. We use n8n, but you may use n8n, Make, a plain Node script, or a serverless function — explain your choice.

## The scenario

When a new property lead comes in (from a web form), the system should automatically:

1. Receive the lead (a webhook receiving JSON: name, phone, email, message, budget, area)
2. Validate it (reject spam / empty / fake-looking entries)
3. Save it to a store (Google Sheet, database, or file)
4. Use AI to classify the lead: **hot / warm / cold** based on the message and budget
5. Send a notification:
   - If **hot** → notify the team immediately (simulate: log it / send to a webhook / mock LINE or email)
   - If **warm/cold** → just save, no urgent notify
6. Send the lead an auto-reply acknowledging their message

## What to deliver

- If n8n: export your workflow as JSON and include it (`/automation/workflow.json`) + screenshots.
- If code: the script + clear run instructions.
- A short explanation of how you'd make this reliable (retries, failures, duplicate leads).

## What we check

- Does the flow handle bad/spam input?
- Is the AI lead-scoring sensible?
- Did you think about failures and duplicates?
- Could a non-developer understand your workflow from the README?

## Bonus (optional)

- Deduplicate repeat leads from the same phone/email.
- Rate-limit or queue if many leads arrive at once.
