# System Design

Task 4 is answered in `DESIGN.md`. It is intentionally kept short and focused on the prompt questions: Graspia at scale, reliability, human handover, and first two-week priorities.

## Files

- `DESIGN.md` - the actual Task 4 answer.
- `DATABASE_DESIGN.md` - supporting database structure notes for projects 01 and 02, based on the implemented code.

## What The Main Design Covers

- Multi-tenant Graspia knowledge storage
- Tenant isolation and data leak prevention
- AI cost control as conversations grow
- AI outage behavior and durable message/lead handling
- Human handover SLA and queue tracking
- Practical first two-week priorities

## Why Database Notes Are Separate

The original Task 4 asks for a concise written system design, not a schema document. The database details are useful for reviewers, but keeping them in `DATABASE_DESIGN.md` avoids making `DESIGN.md` too long or off-prompt.
