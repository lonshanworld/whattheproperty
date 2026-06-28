import { businessProfile } from "@/lib/business-profile";
import { runSalesAgent } from "@/lib/agent";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase";
import type { AutomationEvent, ChatMessage, HandoverEvent, LanguageCode } from "@/lib/types";
import { NextResponse } from "next/server";

type ChatRequest = {
  conversationId?: string;
  messages?: ChatMessage[];
  preferredLanguage?: LanguageCode;
};

type AutomationWebhookPayload = {
  conversationId: string;
  preferredLanguage: LanguageCode;
  name: string;
  phone: string;
  email: string;
  message: string;
  budget: string;
  area: string;
  messages: ChatMessage[];
  handover: HandoverEvent;
  lead: {
    name: string | null;
    email: string | null;
    phone: string | null;
    preferredContact: string | null;
    notes: string | null;
  };
  business: {
    name: string;
    salesContact: string;
  };
};

type LeadRecordPayload = {
  conversationId: string;
  preferredLanguage: LanguageCode;
  name: string;
  phone: string;
  email: string;
  message: string;
  budget: string;
  area: string;
  handover: HandoverEvent;
  automation: AutomationEvent;
  rawPayload: Record<string, unknown>;
};

const automationWebhookUrl = process.env.NOTIFY_WEBHOOK_URL;

function firstNonEmpty(...values: Array<string | null | undefined>) {
  return values.map((value) => value?.trim()).find(Boolean) ?? "";
}

function getAllUserText(messages: ChatMessage[]) {
  return messages
    .filter((message) => message.role === "user")
    .map((message) => message.content)
    .join(" ");
}

// Return the latest user message so the automation payload has a direct customer request string.
function getLatestUserMessage(messages: ChatMessage[]) {
  return [...messages].reverse().find((message) => message.role === "user")?.content ?? "";
}

function extractEmail(text: string) {
  return text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? "";
}

function extractPhone(text: string) {
  return text.match(/(?:\+\d{7,15}|(?:\+?66|0)\d[\d\s-]{7,})/)?.[0] ?? "";
}

function extractName(text: string) {
  return (
    text.match(/(?:my name is|name is|i am|i'm)\s+([A-Za-z][A-Za-z\s'-]{1,40})/i)?.[1]?.trim() ??
    ""
  );
}

function extractPreferredContact(text: string) {
  if (/\bline\b|\bline id\b/i.test(text)) {
    return "LINE";
  }

  if (extractEmail(text)) {
    return "email";
  }

  if (extractPhone(text)) {
    return "phone";
  }

  return "";
}

// Extract a budget-like phrase from the conversation text when the lead has not provided one explicitly.
function extractBudget(text: string) {
  const match = text.match(/(\d+(?:[.,]\d+)?)\s*(million|m|thb|baht|บาท|ล้าน|k)?/i);
  return match ? match[0] : "";
}

// Guess a simple area/location phrase so the workflow receives the required lead fields.
function extractArea(text: string) {
  const areaMatch = text.match(
    /\b(Bangkok|Chiang Mai|Phuket|Pattaya|Nonthaburi|Pathum Thani|Samut Prakan)\b/i,
  );

  return areaMatch?.[0] ?? "";
}

// Strip invalid content and coerce messages into a safe chat history shape.
function sanitizeMessages(messages: ChatMessage[]) {
  return messages
    .filter((message) => message && typeof message.content === "string")
    .map<ChatMessage>((message) => ({
      role:
        message.role === "assistant" || message.role === "system" ? message.role : "user",
      content: message.content.trim(),
    }))
    .filter((message) => message.content.length > 0);
}

// Build a fallback summary when the model does not return one.
function getFallbackSummary(messages: ChatMessage[]) {
  const lastUser = [...messages].reverse().find((message) => message.role === "user")?.content;
  return lastUser
    ? `Customer asked: ${lastUser}`
    : "Customer requested a human handover.";
}

function buildConversationLead(
  messages: ChatMessage[],
  lead: AutomationWebhookPayload["lead"],
  handoverSummary: string,
) {
  const allUserText = getAllUserText(messages);
  const combinedText = `${allUserText} ${lead.notes ?? ""} ${handoverSummary}`.trim();
  const recentUserMessages = messages
    .filter((message) => message.role === "user")
    .slice(-3)
    .map((message) => message.content);

  return {
    name: firstNonEmpty(lead.name, extractName(allUserText)) || null,
    email: firstNonEmpty(lead.email, extractEmail(allUserText)) || null,
    phone: firstNonEmpty(lead.phone, extractPhone(allUserText)) || null,
    preferredContact: firstNonEmpty(lead.preferredContact, extractPreferredContact(allUserText)) || null,
    notes:
      firstNonEmpty(lead.notes) ||
      (recentUserMessages.length > 0 ? recentUserMessages.join(" | ").slice(0, 300) : null),
    allUserText,
    combinedText,
  };
}

function buildLeadDedupeKey({
  conversationId,
  email,
  phone,
}: {
  conversationId: string;
  email: string;
  phone: string;
}) {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedPhone = phone.replace(/\D/g, "");

  if (normalizedEmail) {
    return `email:${normalizedEmail}`;
  }

  if (normalizedPhone) {
    return `phone:${normalizedPhone}`;
  }

  return `conversation:${conversationId}`;
}

// Post the handover JSON to n8n and return the workflow's automation result.
async function sendAutomationWebhook(payload: AutomationWebhookPayload) {
  if (!automationWebhookUrl) {
    return null;
  }

  try {
    const response = await fetch(automationWebhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Automation webhook failed:", response.status, errorText);
      return null;
    }

    return (await response.json()) as AutomationEvent;
  } catch (error) {
    console.error("Automation webhook failed:", error);
    return null;
  }
}

// Persist the conversation transcript and handover metadata to Supabase.
async function logConversation({
  conversationId,
  messages,
  handoverEvent,
  automationEvent,
  lead,
}: {
  conversationId: string;
  messages: ChatMessage[];
  handoverEvent: HandoverEvent | null;
  automationEvent: AutomationEvent | null;
  lead: {
    name: string | null;
    email: string | null;
    phone: string | null;
    preferredContact: string | null;
    notes: string | null;
  };
}) {
  if (!isSupabaseConfigured) {
    return;
  }

  try {
    const supabase = createSupabaseServerClient();
    const payload = {
      conversation_id: conversationId,
      messages,
      escalated: Boolean(handoverEvent),
      escalation_reason: handoverEvent?.reason ?? null,
      handover_summary: handoverEvent?.summary ?? null,
      handover_event: handoverEvent,
      automation_event: automationEvent,
      lead,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("graspia_conversations").upsert(payload, {
      onConflict: "conversation_id",
    });

    if (error) {
      console.error("Supabase logging failed:", error.message);
    }
  } catch (error) {
    console.error("Supabase logging failed:", error);
  }
}

// Persist the handover lead directly so Task 3 storage does not depend on n8n succeeding.
async function logLeadRecord({
  conversationId,
  preferredLanguage,
  name,
  phone,
  email,
  message,
  budget,
  area,
  handover,
  automation,
  rawPayload,
}: LeadRecordPayload) {
  if (!isSupabaseConfigured) {
    console.error("Direct lead save skipped: Supabase is not configured.");
    return null;
  }

  try {
    const supabase = createSupabaseServerClient();
    const dedupeKey = buildLeadDedupeKey({ conversationId, email, phone });
    const payload = {
      conversation_id: conversationId,
      dedupe_key: dedupeKey,
      preferred_language: preferredLanguage,
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      message: message.trim(),
      budget: budget.trim(),
      area: area.trim(),
      handover_reason: handover.reason,
      handover_summary: handover.summary,
      status: automation.accepted ? "accepted" : "rejected",
      validation_reason: automation.validationReason,
      tier: automation.tier,
      reasoning: automation.reasoning,
      auto_reply: automation.autoReply,
      notify_urgent: automation.notifyUrgent,
      notification_sent: automation.notificationSent ?? false,
      notification_channel: automation.notificationChannel,
      source_payload: rawPayload,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("graspia_leads")
      .upsert(payload, { onConflict: "dedupe_key" })
      .select("id")
      .single();

    if (error) {
      console.error("Direct lead save failed:", {
        conversationId,
        dedupeKey,
        error: error.message,
      });
      return null;
    }

    console.log("Direct lead saved:", {
      conversationId,
      dedupeKey,
      leadRecordId: data?.id ?? null,
    });

    return data?.id ?? null;
  } catch (error) {
    console.error("Direct lead save failed:", error);
    return null;
  }
}

// Receive one chat turn, run the sales agent, and return either a reply or a handover event.
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ChatRequest;
    const conversationId = body.conversationId ?? crypto.randomUUID();
    const messages = sanitizeMessages(body.messages ?? []);
    const preferredLanguage: LanguageCode = body.preferredLanguage ?? "en";
    const lastMessage = messages.at(-1);

    if (!lastMessage || lastMessage.role !== "user") {
      return NextResponse.json(
        { error: "The latest message must be from the user." },
        { status: 400 },
      );
    }

    const decision = await runSalesAgent(messages, preferredLanguage);
    const handoverEvent: HandoverEvent | null = decision.shouldHandover
      ? {
          handover: true,
          reason: decision.handoverReason === "none" ? "unknown_question" : decision.handoverReason,
          summary: decision.handoverSummary || getFallbackSummary(messages),
          confidence: decision.confidence,
        }
      : null;
    const conversationLead = buildConversationLead(
      messages,
      decision.lead,
      handoverEvent?.summary ?? "",
    );
    const leadMessage =
      conversationLead.allUserText || getLatestUserMessage(messages) || handoverEvent?.summary || "";
    const leadBudget = extractBudget(conversationLead.combinedText) || "";
    const leadArea = extractArea(conversationLead.combinedText) || "";
    const leadPayload = {
      name: conversationLead.name ?? "",
      phone: conversationLead.phone ?? "",
      email: conversationLead.email ?? "",
      message: leadMessage,
      budget: leadBudget,
      area: leadArea,
    };

    const automationEvent =
      handoverEvent === null
        ? null
        : await sendAutomationWebhook({
            conversationId,
            preferredLanguage,
            ...leadPayload,
            messages,
            handover: handoverEvent,
            lead: {
              name: conversationLead.name,
              email: conversationLead.email,
              phone: conversationLead.phone,
              preferredContact: conversationLead.preferredContact,
              notes: conversationLead.notes,
            },
            business: {
              name: businessProfile.business_name,
              salesContact: businessProfile.human_team.sales_contact,
            },
          });

    const finalAssistantMessage = handoverEvent
      ? (automationEvent?.autoReply ?? "")
      : decision.answer;
    const leadHasContact = Boolean(leadPayload.phone || leadPayload.email);
    const leadAutomationEvent: AutomationEvent | null = handoverEvent
      ? (automationEvent ?? {
          accepted: leadHasContact,
          rejected: !leadHasContact,
          tier: handoverEvent.reason === "ready_to_buy" ? "hot" : "warm",
          reasoning: `Handover triggered: ${handoverEvent.reason}`,
          autoReply: finalAssistantMessage,
          notifyUrgent: handoverEvent.reason === "ready_to_buy",
          notificationSent: false,
          notificationChannel: "app-direct",
          validationReason: leadHasContact ? null : "missing_contact",
        })
      : null;

    const leadRecordId =
      handoverEvent && leadAutomationEvent
        ? await logLeadRecord({
            conversationId,
            preferredLanguage,
            ...leadPayload,
            handover: handoverEvent,
            automation: leadAutomationEvent,
            rawPayload: {
              conversationId,
              preferredLanguage,
              ...leadPayload,
              messages,
              handover: handoverEvent,
              lead: {
                name: conversationLead.name,
                email: conversationLead.email,
                phone: conversationLead.phone,
                preferredContact: conversationLead.preferredContact,
                notes: conversationLead.notes,
              },
              business: {
                name: businessProfile.business_name,
                salesContact: businessProfile.human_team.sales_contact,
              },
            },
          })
        : null;
    const finalAutomationEvent =
      leadAutomationEvent && leadRecordId
        ? { ...leadAutomationEvent, leadRecordId }
        : leadAutomationEvent;

    const fullMessages = finalAssistantMessage
      ? [...messages, { role: "assistant" as const, content: finalAssistantMessage }]
      : messages;

    await logConversation({
      conversationId,
      messages: fullMessages,
      handoverEvent,
      automationEvent: finalAutomationEvent,
      lead: {
        name: conversationLead.name,
        email: conversationLead.email,
        phone: conversationLead.phone,
        preferredContact: conversationLead.preferredContact,
        notes: conversationLead.notes,
      },
    });

    return NextResponse.json({
      conversationId,
      message: finalAssistantMessage || null,
      handover: handoverEvent,
      confidence: decision.confidence,
      lead: {
        name: conversationLead.name,
        email: conversationLead.email,
        phone: conversationLead.phone,
        preferredContact: conversationLead.preferredContact,
        notes: conversationLead.notes,
      },
      automation: finalAutomationEvent,
      business: {
        name: businessProfile.business_name,
        salesContact: businessProfile.human_team.sales_contact,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unexpected server error.",
      },
      { status: 500 },
    );
  }
}
