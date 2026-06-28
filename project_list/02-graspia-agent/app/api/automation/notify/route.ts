import { NextResponse } from "next/server";

type NotifyRequest = {
  conversationId: string;
  lead: {
    name: string;
    phone: string;
    email: string;
    message: string;
    budget: string;
    area: string;
  };
  automation: {
    tier: "hot" | "warm" | "cold";
    reasoning: string;
  };
  handover?: {
    reason?: string;
    summary?: string;
  } | null;
};

// Simulate an urgent hot-lead notification target that n8n can call through a real webhook step.
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as NotifyRequest;

    console.log("Hot lead notification received:", {
      conversationId: body.conversationId,
      tier: body.automation.tier,
      reason: body.handover?.reason ?? null,
      name: body.lead.name,
      phone: body.lead.phone,
      email: body.lead.email,
    });

    return NextResponse.json({
      ok: true,
      notificationSent: true,
      channel: "mock-webhook",
      receivedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unexpected notification error.",
      },
      { status: 500 },
    );
  }
}
