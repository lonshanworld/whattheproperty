# Property Matching

Task 1 implementation: a small full-stack property search app that stores listings in PostgreSQL and uses an LLM-backed matcher to rank the best three listings for a natural-language buyer request.

## What Is Included

- Next.js app router frontend in `app/page.tsx`
- Backend routes:
  - `GET /api/listings`
  - `POST /api/match`
- PostgreSQL storage through `pg`
- Seed data from `data/listings.json`
- OpenAI matching through `lib/match.ts`
- Deterministic fallback matcher when OpenAI is unavailable
- English and Thai UI/request support
- In-memory prompt cache for repeated matching requests

## Setup

```bash
npm install
```

Create `.env.local`:

```bash
DATABASE_URL=postgres://USER:PASSWORD@localhost:5432/property_matching
OPENAI_API_KEY=your_openai_api_key
```

Start the app:

```bash
npm run dev
```

Open `http://localhost:3000`.

The database table is created automatically on first API use, and the 10 sample listings are upserted from `data/listings.json`.

## API

### `GET /api/listings`

Returns all listings, sorted by price, with optional filters:

```text
/api/listings?city=Bangkok&maxPrice=6000000&bedrooms=2
```

Response:

```json
{"listings":[{"id":"P001","title":"Modern 2-Bed Condo near BTS Asok","city":"Bangkok","area":"Asok","price":5800000,"bedrooms":2,"bathrooms":2,"size_sqm":58,"type":"condo","near_transit":"BTS Asok (300m)","furnished":true,"image":"https://placehold.co/600x400?text=Asok+Condo","description":"Bright corner unit, family-friendly building, pool and gym."}]}
```

### `POST /api/match`

Request:

```json
{
  "request": "I want a 2-bedroom condo near BTS in Bangkok under 6 million baht for my family",
  "language": "en"
}
```

Response:

```json
{
  "matches": [
    {
      "listing": {
        "id": "P001",
        "title": "Modern 2-Bed Condo near BTS Asok",
        "city": "Bangkok",
        "area": "Asok",
        "price": 5800000,
        "bedrooms": 2,
        "bathrooms": 2,
        "size_sqm": 58,
        "type": "condo",
        "near_transit": "BTS Asok (300m)",
        "furnished": true,
        "image": "https://placehold.co/600x400?text=Asok+Condo",
        "description": "Bright corner unit, family-friendly building, pool and gym."
      },
      "reason": "Best fit: 2-bedroom condo in Bangkok, 300m from BTS Asok, and within budget at 5.8M baht. Family-friendly building makes it practical for family living."
    },
    {
      "listing": {
        "id": "P009",
        "title": "Affordable 2-Bed Condo Nonthaburi",
        "city": "Nonthaburi",
        "area": "Bang Yai",
        "price": 3100000,
        "bedrooms": 2,
        "bathrooms": 1,
        "size_sqm": 48,
        "type": "condo",
        "near_transit": "MRT Bang Yai (350m)",
        "furnished": false,
        "image": "https://placehold.co/600x400?text=Nonthaburi+Condo",
        "description": "Good value for families, near big mall and MRT, growing area."
      },
      "reason": "Meets the 2-bedroom and budget needs at 3.1M baht with MRT Bang Yai 350m away. It is not near BTS and is outside Bangkok proper, but it is a good value fallback."
    },
    {
      "listing": {
        "id": "P010",
        "title": "Beachfront 2-Bed Condo Pattaya",
        "city": "Pattaya",
        "area": "Jomtien",
        "price": 5500000,
        "bedrooms": 2,
        "bathrooms": 2,
        "size_sqm": 65,
        "type": "condo",
        "near_transit": "none",
        "furnished": true,
        "image": "https://placehold.co/600x400?text=Pattaya+Condo",
        "description": "Sea view, rental investment popular with tourists, beachfront."
      },
      "reason": "2-bedroom condo under budget at 5.5M baht, but it is in Pattaya and has no transit access. Included as a practical alternative if location is flexible."
    }
  ]
}
```

## Matching Logic

The happy path uses OpenAI to choose exactly three listings and return specific, buyer-facing reasons. The model is given only the current request plus the seeded listings and is asked for strict JSON.

If the AI call fails, times out, returns malformed JSON, or no API key is configured, the app falls back to a local scoring function. The fallback considers city, area, property type, BTS/MRT access, family intent, budget, bedroom count, and lifestyle keywords such as quiet, school, beach, mountain, and investment.

## Real-World Judgment

- Error handling: empty match requests return `400`; AI failures are logged and fall back to deterministic ranking instead of breaking the user flow.
- Edge cases: vague requests still return practical matches with a reason; budget and bedroom extraction tolerate common forms like `6 million`, `6m`, and Thai `ล้าน`.
- Cost control: repeated requests are cached in memory, and the AI call is capped with a short timeout.
- Data safety: SQL queries use parameterized values, and seed writes use `ON CONFLICT` so repeated starts are idempotent.
- Human handover: this project is buyer self-service matching, not a live sales chat. In production, If the AI doesn't understand the buyer's request or gets confused, it should stop and flag the request for a human to review instead of trying to give a fake or wrong answer.

## Scripts

```bash
npm run lint
npm run build
```

Both pass in the current project state.

## Files To Review

- `app/page.tsx` - frontend search and listing cards
- `app/api/listings/route.ts` - filterable listing API
- `app/api/match/route.ts` - matching API
- `lib/db.ts` - PostgreSQL schema, seed, and query logic
- `lib/match.ts` - AI matching, fallback scoring, and cache
