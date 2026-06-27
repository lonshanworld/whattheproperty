# Task 1 — Property Listing + AI Matching

**Goal:** Build a small app that stores property listings and matches a buyer to the best ones using an LLM.

## What to build

1. **A database** (any: PostgreSQL, SQLite, Supabase, Firebase, even JSON file if you explain why).
   - Use the sample data in `/data/listings.json` (10 properties). Load it into your database.

2. **A backend API** with these endpoints:
   - `GET /listings` — return all listings (support filter by `?city=`, `?maxPrice=`, `?bedrooms=`)
   - `POST /match` — accepts a buyer request in plain language and returns the 3 best-matching listings

3. **AI matching logic** for `POST /match`:
   - Input example: `{ "request": "I want a 2-bedroom condo near BTS in Bangkok under 6 million baht for my family" }`
   - Use Claude or OpenAI to understand the request and pick/rank the best listings.
   - Return the top 3 with a short reason for each match.

4. **A simple frontend page** (one page is fine):
   - A search box where a user types what they want
   - Shows the matched listings as cards (image, price, beds, location, match reason)

## What we check

- Does the AI actually understand natural language requests?
- Do you handle a vague request gracefully (e.g. "somewhere nice and cheap")?
- Is the matching reason useful, not generic?
- Clean separation: frontend / backend / AI logic.

## Bonus (optional)

- Handle Thai-language requests too.
- Cache or reduce repeated AI calls to save cost.
