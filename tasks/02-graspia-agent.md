# Task 2 — Graspia AI Sales Agent + Human Handover

**This is the most important task.** Graspia is a B2B AI sales agent. A business connects it to their chat channel. It talks to incoming clients, answers questions, tries to close the deal, and hands the conversation to a human when needed.

## What to build

A backend chat agent (API or simple chat UI) that acts as a sales agent for a sample business.

Use this sample business profile (in `/data/business-profile.json`): a company that sells solar panel installation.

### Core behavior

1. **Talk to the client** using Claude or OpenAI.
   - Answer product questions from the business profile.
   - Be helpful and try to move toward a sale (book a call / get contact info).

2. **Detect when to hand over to a human.** This is the key part. The agent must escalate when:
   - The client is angry or frustrated
   - The client asks something the agent cannot answer / not in the profile
   - The client is ready to buy / sign / pay (close moment)
   - The client explicitly asks for a human
   - The agent is unsure or the conversation is going in circles

3. **On handover**, the agent should:
   - Stop replying as the bot
   - Output a clear handover signal (e.g. a JSON event `{ "handover": true, "reason": "...", "summary": "..." }`)
   - Include a short summary of the conversation so the human has context

4. **Log every conversation** somewhere (DB or file) with: messages, whether it escalated, and why.

## What we check

- Does the handover trigger correctly in the right moments (not too early, not too late)?
- Is the escalation reason accurate?
- Is the human-handover summary actually useful?
- Does the agent stay on-topic and not hallucinate fake product details?
- How do you handle the client trying to trick or jailbreak the agent?

## Test it

Include in your README **5 example conversations** showing:
- One normal answered question
- One successful close (lead captured)
- One angry-client handover
- One unknown-question handover
- One jailbreak attempt and how the agent resisted

## Bonus (optional)

- Multi-language (Thai + English).
- A "confidence score" the agent uses to decide handover.
