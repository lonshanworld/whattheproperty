import OpenAI from "openai";

import { getListings } from "@/lib/db";
import type { Listing, MatchResult } from "@/lib/types";

type Language = "en" | "th";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      maxRetries: 0,
      timeout: 8000,
    })
  : null;

const matchCache = new Map<string, MatchResult[]>();
const CACHE_LIMIT = 30;

// Normalizes text so matching rules can compare phrases consistently.
function normalizeText(value: string) {
  return value.toLowerCase().trim();
}

// Returns language-aware wording for fallback match explanations.
function textByLanguage(language: Language) {
  return language === "th"
    ? {
        bedroomMatch: "ตรงกับจำนวนห้องนอนที่ต้องการ",
        isInCity: "อยู่ใน",
        outsideBangkok: "อยู่นอกกรุงเทพฯ ที่",
        closeTo: "อยู่ใกล้",
        withinBudget: "อยู่ในงบที่",
        overBudget: "เกินงบที่",
        familyFriendly: "เหมาะกับครอบครัว",
        familySize: "มีขนาดเหมาะกับครอบครัวมากกว่า",
        practical: "เป็นตัวเลือกที่สมดุลเรื่องราคา พื้นที่ และทำเล",
        tradeoff: "ข้อแลกเปลี่ยน",
        bedrooms: "ห้องนอน",
        noBts: "ไม่มี BTS ใกล้เคียง",
        noMrt: "ไม่มี MRT ใกล้เคียง",
        baht: "บาท",
      }
    : {
        bedroomMatch: "matches the requested bedroom count",
        isInCity: "is in",
        outsideBangkok: "is outside Bangkok in",
        closeTo: "is close to",
        withinBudget: "stays within the budget at",
        overBudget: "is above budget at",
        familyFriendly: "has a family-friendly setup",
        familySize: "offers a more family-suitable size",
        practical: "offers a practical mix of price, size, and location",
        tradeoff: "Tradeoff",
        bedrooms: "bedroom",
        noBts: "does not have BTS access nearby",
        noMrt: "does not have MRT access nearby",
        baht: "baht",
      };
}

// Pulls an estimated budget out of the buyer request when possible.
function extractBudget(request: string) {
  const normalized = request.toLowerCase().replace(/,/g, "");
  const millionMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(m|million|ล้าน)/);
  if (millionMatch) {
    return Math.round(Number(millionMatch[1]) * 1_000_000);
  }

  const bahtMatch = normalized.match(/(\d{6,8})\s*(baht|thb|บาท)?/);
  if (bahtMatch) {
    return Number(bahtMatch[1]);
  }

  return null;
}

// Scores a listing against the request using lightweight keyword heuristics.
function scoreListing(request: string, listing: Listing) {
  const text = normalizeText(request);
  let score = 0;

  if (text.includes(listing.city.toLowerCase())) score += 30;
  if (text.includes(listing.area.toLowerCase())) score += 20;
  if (text.includes(listing.type.toLowerCase())) score += 15;
  if (text.includes("bts") && listing.near_transit.toLowerCase().includes("bts")) score += 18;
  if (text.includes("mrt") && listing.near_transit.toLowerCase().includes("mrt")) score += 18;
  if (text.includes("near transit") && listing.near_transit.toLowerCase() !== "none") score += 10;
  if (text.includes("family") && listing.bedrooms >= 2) score += 16;
  if (text.includes("cheap") || text.includes("affordable") || text.includes("budget")) {
    score += Math.max(0, 15 - Math.round(listing.price / 1_000_000));
  }
  if (text.includes("luxury") && listing.price >= 10_000_000) score += 15;
  if (text.includes("quiet") && listing.description.toLowerCase().includes("quiet")) score += 10;
  if (text.includes("school") && listing.description.toLowerCase().includes("school")) score += 10;
  if (text.includes("beach") && listing.description.toLowerCase().includes("beach")) score += 18;
  if (text.includes("mountain") && listing.description.toLowerCase().includes("mountain")) score += 18;
  if (text.includes("investment") && listing.description.toLowerCase().includes("investment")) score += 12;

  const bedroomMatch = text.match(/(\d+)[ -]?(bed|bedroom)/);
  if (bedroomMatch) {
    const requestedBedrooms = Number(bedroomMatch[1]);
    score += Math.max(0, 25 - Math.abs(listing.bedrooms - requestedBedrooms) * 10);
  }

  const budget = extractBudget(request);
  if (budget) {
    if (listing.price <= budget) score += 22;
    else score -= 18 + Math.ceil((listing.price - budget) / 500_000);
  }

  score += Math.max(0, 10 - Math.round(listing.price / 3_000_000));

  return score;
}

// Builds a clear explanation for why the fallback matcher chose this listing.
function buildFallbackReason(request: string, listing: Listing, language: Language) {
  const text = normalizeText(request);
  const budget = extractBudget(request);
  const requestedBedrooms = text.match(/(\d+)[ -]?(bed|bedroom)/)?.[1];
  const reasons: string[] = [];
  const tradeoffs: string[] = [];
  const copy = textByLanguage(language);

  if (requestedBedrooms && listing.bedrooms === Number(requestedBedrooms)) {
    reasons.push(
      language === "th"
        ? `${copy.bedroomMatch} (${listing.bedrooms} ${copy.bedrooms})`
        : `${copy.bedroomMatch} (${listing.bedrooms}-${copy.bedrooms})`,
    );
  } else if (requestedBedrooms) {
    tradeoffs.push(
      language === "th"
        ? `มี ${listing.bedrooms} ${copy.bedrooms} แทน ${requestedBedrooms}`
        : `has ${listing.bedrooms} ${copy.bedrooms}${listing.bedrooms === 1 ? "" : "s"} instead of ${requestedBedrooms}`,
    );
  }

  if (text.includes(listing.city.toLowerCase())) {
    reasons.push(`${copy.isInCity} ${listing.city}`);
  } else if (text.includes("bangkok") && listing.city !== "Bangkok") {
    tradeoffs.push(`${copy.outsideBangkok} ${listing.city}`);
  }

  if (text.includes("bts")) {
    if (listing.near_transit.toLowerCase().includes("bts")) {
      reasons.push(`${copy.closeTo} ${listing.near_transit}`);
    } else {
      tradeoffs.push(copy.noBts);
    }
  }

  if (text.includes("mrt")) {
    if (listing.near_transit.toLowerCase().includes("mrt")) {
      reasons.push(`${copy.closeTo} ${listing.near_transit}`);
    } else {
      tradeoffs.push(copy.noMrt);
    }
  }

  if (budget) {
    if (listing.price <= budget) {
      reasons.push(
        `${copy.withinBudget} ${new Intl.NumberFormat("en-US").format(listing.price)} ${copy.baht}`,
      );
    } else {
      tradeoffs.push(
        `${copy.overBudget} ${new Intl.NumberFormat("en-US").format(listing.price)} ${copy.baht}`,
      );
    }
  }

  if (text.includes("family") && listing.description.toLowerCase().includes("family")) {
    reasons.push(copy.familyFriendly);
  } else if (text.includes("family") && listing.bedrooms >= 2) {
    reasons.push(copy.familySize);
  }

  if (reasons.length === 0) {
    reasons.push(copy.practical);
  }

  if (tradeoffs.length > 0) {
    return `${reasons.join(", ")}. ${copy.tradeoff}: ${tradeoffs[0]}.`;
  }

  return `${reasons.join(", ")}.`;
}

// Ranks the listings locally when the AI path is unavailable.
function heuristicMatches(request: string, listings: Listing[], language: Language) {
  return [...listings]
    .sort((left, right) => scoreListing(request, right) - scoreListing(request, left))
    .slice(0, 3)
    .map((listing) => ({
      listing,
      reason: buildFallbackReason(request, listing, language),
    }));
}

// Stores recent matching results so repeated prompts are cheaper.
function updateCache(key: string, value: MatchResult[]) {
  if (matchCache.size >= CACHE_LIMIT) {
    const oldestKey = matchCache.keys().next().value;
    if (oldestKey) {
      matchCache.delete(oldestKey);
    }
  }

  matchCache.set(key, value);
}

// Extracts the JSON payload from the model response.
function parseAiPayload(content: string) {
  const match = content.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error("No JSON object found in AI response.");
  }

  return JSON.parse(match[0]) as {
    matches?: Array<{ id?: string; reason?: string }>;
  };
}

// Matches a buyer request to the three best listings, using AI when possible.
export async function matchBuyerRequest(request: string, language: Language = "en") {
  const normalizedRequest = normalizeText(request);
  if (!normalizedRequest) {
    throw new Error("Request is required.");
  }

  const cacheKey = `${language}:${normalizedRequest}`;
  const cached = matchCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const listings = await getListings();
  const fallbackMatches = heuristicMatches(request, listings, language);

  if (!openai) {
    updateCache(cacheKey, fallbackMatches);
    return fallbackMatches;
  }

  try {
    const response = await openai.responses.create({
      model: "gpt-5.4-mini",
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text:
                language === "th"
                  ? "คุณช่วยจับคู่ประกาศอสังหาฯ กับความต้องการของผู้ซื้อ ตอบเป็น JSON แบบเคร่งครัดเท่านั้นในรูปแบบ {\"matches\":[{\"id\":\"P001\",\"reason\":\"...\"}]}. เลือก 3 รายการจากข้อมูลที่ให้มา เรียงจากตรงที่สุดไปน้อยที่สุด เหตุผลต้องเจาะจง กระชับ และมีประโยชน์ ถ้าคำขอคลุมเครือ ให้ตีความอย่างสมเหตุสมผลและอธิบายว่าทำไมรายการนั้นจึงเป็นตัวเลือกที่ดี"
                  : "You match property listings to buyer requests. Return strict JSON only in the shape {\"matches\":[{\"id\":\"P001\",\"reason\":\"...\"}]}. Pick exactly 3 listings from the provided data, sorted best to worst. Reasons must be specific, concise, and helpful. If the buyer request is vague, make a reasonable interpretation and say what made the listing a practical option.",
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text:
                language === "th"
                  ? `คำขอของผู้ซื้อ: ${request}\n\nข้อมูลประกาศ:\n${JSON.stringify(listings, null, 2)}`
                  : `Buyer request: ${request}\n\nListings:\n${JSON.stringify(listings, null, 2)}`,
            },
          ],
        },
      ],
    });

    const parsed = parseAiPayload(response.output_text);
    const results = (parsed.matches ?? [])
      .map((match) => {
        const listing = listings.find((item) => item.id === match.id);
        if (!listing || !match.reason) {
          return null;
        }

        return {
          listing,
          reason: match.reason,
        };
      })
      .filter((value): value is MatchResult => value !== null)
      .slice(0, 3);

    if (results.length === 3) {
      updateCache(cacheKey, results);
      return results;
    }
  } catch (error) {
    console.error("AI matching failed, using fallback ranking.", error);
  }

  updateCache(cacheKey, fallbackMatches);
  return fallbackMatches;
}
