import { matchBuyerRequest } from "@/lib/match";

// Accepts a plain-language request and returns the top three matches.
export async function POST(request: Request) {
  const body = (await request.json()) as {
    request?: string;
    language?: "en" | "th";
  };

  if (!body.request?.trim()) {
    return Response.json(
      { error: "Request is required." },
      { status: 400 },
    );
  }

  const matches = await matchBuyerRequest(body.request, body.language ?? "en");

  return Response.json({ matches });
}
