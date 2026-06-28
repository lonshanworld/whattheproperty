import type { NextRequest } from "next/server";

import { getListings } from "@/lib/db";

// Returns all listings, with optional city, price, and bedroom filters.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const city = searchParams.get("city") || undefined;
  const maxPriceParam = searchParams.get("maxPrice");
  const bedroomsParam = searchParams.get("bedrooms");

  const listings = await getListings({
    city,
    maxPrice: maxPriceParam ? Number(maxPriceParam) : undefined,
    bedrooms: bedroomsParam ? Number(bedroomsParam) : undefined,
  });

  return Response.json({ listings });
}
