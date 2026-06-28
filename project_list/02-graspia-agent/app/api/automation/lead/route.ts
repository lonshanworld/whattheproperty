import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase";
import { NextResponse } from "next/server";

type LeadSaveRequest = {
  conversationId: string;
  preferredLanguage?: "en" | "th";
  name: string;
  phone: string;
  email: string;
  message: string;
  budget: string;
  area: string;
  handover?: {
    reason?: string;
    summary?: string;
  } | null;
  automation: {
    accepted: boolean;
    rejected: boolean;
    tier: "hot" | "warm" | "cold";
    reasoning: string;
    autoReply: string;
    notifyUrgent: boolean;
    notificationSent?: boolean;
    notificationChannel: string;
    validationReason: string | null;
  };
  rawPayload?: Record<string, unknown>;
};

// Normalize phone or email into one deduplication key so repeated leads update instead of duplicating.
function buildDedupeKey(body: LeadSaveRequest) {
  const normalizedEmail = body.email.trim().toLowerCase();
  const normalizedPhone = body.phone.replace(/\D/g, "");

  if (normalizedEmail) {
    return `email:${normalizedEmail}`;
  }

  if (normalizedPhone) {
    return `phone:${normalizedPhone}`;
  }

  return `conversation:${body.conversationId}`;
}

// Save or update one automation lead record in Supabase.
export async function POST(request: Request) {
  try {
    if (!isSupabaseConfigured) {
      console.error("Automation lead save skipped: Supabase is not configured.");
      return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
    }

    const body = (await request.json()) as LeadSaveRequest;
    const dedupeKey = buildDedupeKey(body);
    const supabase = createSupabaseServerClient();

    const payload = {
      conversation_id: body.conversationId,
      dedupe_key: dedupeKey,
      preferred_language: body.preferredLanguage ?? "en",
      name: body.name.trim(),
      phone: body.phone.trim(),
      email: body.email.trim(),
      message: body.message.trim(),
      budget: body.budget.trim(),
      area: body.area.trim(),
      handover_reason: body.handover?.reason ?? null,
      handover_summary: body.handover?.summary ?? null,
      status: body.automation.accepted ? "accepted" : "rejected",
      validation_reason: body.automation.validationReason,
      tier: body.automation.tier,
      reasoning: body.automation.reasoning,
      auto_reply: body.automation.autoReply,
      notify_urgent: body.automation.notifyUrgent,
      notification_sent: body.automation.notificationSent ?? false,
      notification_channel: body.automation.notificationChannel,
      source_payload: body.rawPayload ?? body,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("graspia_leads")
      .upsert(payload, { onConflict: "dedupe_key" })
      .select("id")
      .single();

    if (error) {
      console.error("Automation lead save failed:", {
        conversationId: body.conversationId,
        dedupeKey,
        error: error.message,
      });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log("Automation lead saved:", {
      conversationId: body.conversationId,
      dedupeKey,
      leadRecordId: data?.id ?? null,
      tier: body.automation.tier,
      status: body.automation.accepted ? "accepted" : "rejected",
    });

    return NextResponse.json({
      ok: true,
      leadRecordId: data?.id ?? null,
      automation: {
        ...body.automation,
        leadRecordId: data?.id ?? null,
      },
      conversationId: body.conversationId,
    });
  } catch (error) {
    console.error("Unexpected automation save error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unexpected automation save error.",
      },
      { status: 500 },
    );
  }
}
