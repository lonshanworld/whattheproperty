"use client";

import { useEffect, useState, useTransition } from "react";

import type {
  AutomationEvent,
  ChatMessage,
  HandoverEvent,
  LanguageCode,
} from "@/lib/types";

type CopyBundle = {
  appTitle: string;
  pageTitle: string;
  pageDescription: string;
  newConversation: string;
  humanHandover: string;
  handoverDescription: string;
  thinking: string;
  placeholder: string;
  handoverPlaceholder: string;
  sendMessage: string;
  reviewTitle: string;
  reviewItems: string[];
  badgeLanguage: string;
  badgeStorage: string;
  badgeAutomation: string;
  opening: string;
  languageLabel: string;
  languageEnglish: string;
  languageThai: string;
  automationTitle: string;
  automationDescription: string;
  automationLabels: {
    tier: string;
    notify: string;
    validation: string;
    reasoning: string;
  };
  summaryLabel: string;
  jsonLabel: string;
  acceptedLabel: string;
};

const COPY: Record<LanguageCode, CopyBundle> = {
  en: {
    appTitle: "Graspia AI Sales Agent",
    pageTitle: "SunPro Solar lead desk",
    pageDescription:
      "Grounded in the business profile, tuned to qualify leads, and designed to stop immediately when a human handover is the safer move.",
    newConversation: "New conversation",
    humanHandover: "Human handover triggered",
    handoverDescription:
      "The bot has stopped replying. A one-time acknowledgement may still appear below after the automation workflow processes the lead.",
    thinking: "Graspia is thinking...",
    placeholder:
      "Ask about pricing, installation, savings ranges, or try an escalation scenario...",
    handoverPlaceholder:
      "Handover sent. Start a new conversation to test another scenario.",
    sendMessage: "Send message",
    reviewTitle: "What this demo is optimized for",
    reviewItems: [
      "Answers stay grounded in the provided solar business profile.",
      "Close-moment, unknown-question, angry-customer, and explicit-human triggers escalate immediately.",
      "Prompt-injection attempts are refused and redirected back to the allowed sales scope.",
      "Every turn is written to Supabase with the message history and escalation metadata.",
      "The handover JSON is shown outside the chat when the bot stops talking.",
      "After handover, n8n can return one acknowledgement message back into the chat for the customer.",
    ],
    badgeLanguage: "English + Thai",
    badgeStorage: "Supabase logging",
    badgeAutomation: "n8n automation",
    opening:
      "Hello, this is Graspia for SunPro Solar. I can help with packages, pricing ranges, installation, and booking a free site survey. What kind of property are you looking to power?",
    languageLabel: "Language",
    languageEnglish: "English",
    languageThai: "Thai",
    automationTitle: "Automation result",
    automationDescription:
      "This is the workflow result returned after the handover JSON is sent to n8n.",
    automationLabels: {
      tier: "Lead tier",
      notify: "Urgent notify",
      validation: "Validation",
      reasoning: "Reasoning",
    },
    summaryLabel: "Summary",
    jsonLabel: "JSON",
    acceptedLabel: "accepted",
  },
  th: {
    appTitle: "Graspia AI Sales Agent",
    pageTitle: "ศูนย์แชต SunPro Solar",
    pageDescription:
      "ยึดตามข้อมูลธุรกิจที่กำหนดไว้ ช่วยคัดกรองลูกค้า และหยุดตอบทันทีเมื่อควรส่งต่อให้พนักงานจริงดูแลต่อ",
    newConversation: "เริ่มบทสนทนาใหม่",
    humanHandover: "ส่งต่อให้พนักงานแล้ว",
    handoverDescription:
      "บอตหยุดตอบแล้ว แต่หลังจากระบบ automation ประมวลผล lead อาจมีข้อความยืนยันกลับมาในแชตอีก 1 ครั้ง",
    thinking: "Graspia กำลังคิด...",
    placeholder:
      "ถามเรื่องราคา การติดตั้ง ช่วงประหยัดค่าไฟ หรือทดสอบสถานการณ์ที่ต้องส่งต่อได้เลย...",
    handoverPlaceholder:
      "ส่งต่อแล้ว เริ่มบทสนทนาใหม่เพื่อทดสอบสถานการณ์อื่น",
    sendMessage: "ส่งข้อความ",
    reviewTitle: "เดโมนี้เน้นอะไร",
    reviewItems: [
      "คำตอบอ้างอิงจากโปรไฟล์ธุรกิจโซลาร์ที่ให้ไว้เท่านั้น",
      "หากลูกค้าโกรธ ถามเรื่องนอกโปรไฟล์ ขอคุยกับคนจริง หรือพร้อมซื้อ ระบบจะส่งต่อทันที",
      "ความพยายาม jailbreak หรือ prompt injection จะถูกปฏิเสธและพากลับมาที่ขอบเขตงานขายที่อนุญาต",
      "ทุกข้อความถูกบันทึกลง Supabase พร้อมประวัติแชตและข้อมูลการส่งต่อ",
      "จะแสดง handover JSON แยกจากแชตเมื่อบอตหยุดตอบ",
      "หลังส่งต่อ n8n สามารถส่งข้อความยืนยันกลับเข้ามาในแชตได้ 1 ครั้งสำหรับลูกค้า",
    ],
    badgeLanguage: "อังกฤษ + ไทย",
    badgeStorage: "บันทึก Supabase",
    badgeAutomation: "n8n automation",
    opening:
      "สวัสดีค่ะ นี่คือ Graspia สำหรับ SunPro Solar ฉันช่วยเรื่องแพ็กเกจ ช่วงราคา การติดตั้ง และการจองสำรวจหน้างานฟรีได้ คุณกำลังมองหาระบบโซลาร์สำหรับบ้านหรือธุรกิจแบบไหน",
    languageLabel: "ภาษา",
    languageEnglish: "อังกฤษ",
    languageThai: "ไทย",
    automationTitle: "ผลลัพธ์ automation",
    automationDescription:
      "นี่คือผลลัพธ์จาก workflow ที่ส่งกลับมาหลังจากส่ง handover JSON ไปที่ n8n",
    automationLabels: {
      tier: "ระดับลีด",
      notify: "แจ้งด่วน",
      validation: "การตรวจสอบ",
      reasoning: "เหตุผล",
    },
    summaryLabel: "สรุป",
    jsonLabel: "JSON",
    acceptedLabel: "ผ่านการตรวจสอบ",
  },
};

// Return the opening greeting for the currently selected language.
function getOpeningMessage(language: LanguageCode) {
  return COPY[language].opening;
}

// Render the chat interface, keep the UI language in sync, and handle message submission.
export function ChatShell() {
  const [language, setLanguage] = useState<LanguageCode>("en");
  const [conversationId, setConversationId] = useState(() => crypto.randomUUID());
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: getOpeningMessage("en") },
  ]);
  const [input, setInput] = useState("");
  const [handover, setHandover] = useState<HandoverEvent | null>(null);
  const [automation, setAutomation] = useState<AutomationEvent | null>(null);
  const [latestEventJson, setLatestEventJson] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  // Update the document language so browser features match the selected UI language.
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  // Start a fresh conversation using the selected language.
  function resetConversation(nextLanguage: LanguageCode = language) {
    setConversationId(crypto.randomUUID());
    setMessages([{ role: "assistant", content: getOpeningMessage(nextLanguage) }]);
    setInput("");
    setHandover(null);
    setAutomation(null);
    setLatestEventJson(null);
    setError(null);
    setConfidence(null);
  }

  // Change the UI language and reset the conversation so all copy stays aligned.
  function switchLanguage(nextLanguage: LanguageCode) {
    if (nextLanguage === language) {
      return;
    }

    setLanguage(nextLanguage);
    resetConversation(nextLanguage);
  }

  // Send the latest user message to the backend and handle either a reply or a handover.
  function submitMessage() {
    const trimmed = input.trim();

    if (!trimmed || isPending || handover) {
      return;
    }

    const nextMessages = [...messages, { role: "user" as const, content: trimmed }];
    setMessages(nextMessages);
    setInput("");
    setError(null);

    startTransition(async () => {
      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            conversationId,
            preferredLanguage: language,
            messages: nextMessages,
          }),
        });

        const payload = (await response.json()) as {
          error?: string;
          message: string | null;
          handover: HandoverEvent | null;
          automation: AutomationEvent | null;
          lead?: Record<string, unknown>;
          business?: Record<string, unknown>;
          confidence: number;
          conversationId: string;
        };

        if (!response.ok) {
          throw new Error(payload.error ?? "Unable to send message.");
        }

        setConversationId(payload.conversationId);
        setConfidence(payload.confidence);
        setAutomation(payload.automation ?? null);
        setLatestEventJson(
          payload.handover || payload.automation
            ? {
                handover: payload.handover,
                automation: payload.automation,
                lead: payload.lead ?? null,
                business: payload.business ?? null,
              }
            : null,
        );

        if (payload.message) {
          // Append either the normal bot reply or the one-time acknowledgement returned by automation.
          setMessages((current) => [
            ...current,
            { role: "assistant", content: payload.message as string },
          ]);
        }

        if (payload.handover) {
          setHandover(payload.handover);
        } else {
          setHandover(null);
        }
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : "Unexpected error.");
      }
    });
  }

  const copy = COPY[language];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(255,206,102,0.35),_transparent_26%),linear-gradient(135deg,#f7f4ea_0%,#fffdf7_48%,#eef6ed_100%)] px-4 py-8 text-stone-900 sm:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-7xl gap-6 lg:grid-cols-[minmax(0,1.8fr)_340px]">
        <section className="min-w-0 overflow-hidden rounded-[2rem] border border-stone-900/10 bg-white/90 shadow-[0_30px_80px_rgba(76,61,25,0.12)] backdrop-blur">
          <div className="border-b border-stone-900/10 px-6 py-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-700">
                  {copy.appTitle}
                </p>
                <div className="mt-3">
                  <h1 className="font-serif text-3xl leading-tight text-stone-950 sm:text-4xl">
                    {copy.pageTitle}
                  </h1>
                  {/* <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600 sm:text-base">
                    {copy.pageDescription}
                  </p> */}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">
                  {copy.languageLabel}
                </span>
                <button
                  type="button"
                  onClick={() => switchLanguage("en")}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    language === "en"
                      ? "bg-stone-950 text-white"
                      : "border border-stone-300 text-stone-700 hover:border-stone-950 hover:text-stone-950"
                  }`}
                >
                  {copy.languageEnglish}
                </button>
                <button
                  type="button"
                  onClick={() => switchLanguage("th")}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    language === "th"
                      ? "bg-stone-950 text-white"
                      : "border border-stone-300 text-stone-700 hover:border-stone-950 hover:text-stone-950"
                  }`}
                >
                  {copy.languageThai}
                </button>
                <button
                  type="button"
                  onClick={() => resetConversation()}
                  className="rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition hover:border-stone-950 hover:text-stone-950"
                >
                  {copy.newConversation}
                </button>
              </div>
            </div>
          </div>

          <div className="flex min-h-[70vh] flex-col">
            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
              {messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`max-w-[85%] rounded-[1.6rem] px-4 py-3 text-sm leading-6 shadow-sm sm:text-[15px] ${
                    message.role === "user"
                      ? "ml-auto bg-stone-950 text-white"
                      : "bg-[#f6f1df] text-stone-900"
                  }`}
                >
                  {message.content}
                </div>
              ))}

              {isPending ? (
                <div className="max-w-[85%] rounded-[1.6rem] bg-[#f6f1df] px-4 py-3 text-sm text-stone-600 shadow-sm">
                  {copy.thinking}
                </div>
              ) : null}
            </div>

            <div className="border-t border-stone-900/10 px-6 py-5">
              <form
                onSubmit={(event) => {
                  // Prevent a full page refresh and submit the message through React state.
                  event.preventDefault();
                  submitMessage();
                }}
                className="space-y-3"
              >
                <textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder={handover ? copy.handoverPlaceholder : copy.placeholder}
                  disabled={Boolean(handover) || isPending}
                  rows={3}
                  className="w-full resize-none rounded-[1.4rem] border border-stone-300 bg-white px-4 py-3 text-sm leading-6 text-stone-900 outline-none transition focus:border-emerald-600"
                />
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap gap-2 text-xs text-stone-500">
                    <span className="rounded-full bg-stone-100 px-3 py-1">{copy.badgeLanguage}</span>
                    <span className="rounded-full bg-stone-100 px-3 py-1">{copy.badgeStorage}</span>
                    <span className="rounded-full bg-stone-100 px-3 py-1">{copy.badgeAutomation}</span>
                    <span className="rounded-full bg-stone-100 px-3 py-1">
                      Confidence {confidence !== null ? confidence.toFixed(2) : "--"}
                    </span>
                  </div>
                  <button
                    type="submit"
                    disabled={isPending || !input.trim() || Boolean(handover)}
                    className="rounded-full bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-stone-300"
                  >
                    {copy.sendMessage}
                  </button>
                </div>
                {error ? <p className="text-sm text-red-700">{error}</p> : null}
              </form>
            </div>
          </div>
        </section>

        <aside className="w-full rounded-[2rem] border border-stone-900/10 bg-stone-950 p-6 text-stone-100 shadow-[0_30px_80px_rgba(26,26,20,0.28)]">
          {handover ? (
            <div className="mb-6 rounded-[1.6rem] border border-amber-300 bg-amber-50 px-4 py-4 text-sm text-amber-950 shadow-sm">
              <p className="font-semibold uppercase tracking-[0.18em] text-amber-700">
                {copy.humanHandover}
              </p>
              <p className="mt-2">{copy.handoverDescription}</p>
              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
                {copy.summaryLabel}
              </p>
              <p className="mt-1 text-sm leading-6 text-amber-950">{handover.summary}</p>
              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
                {copy.jsonLabel}
              </p>
              <pre className="mt-2 overflow-x-auto rounded-2xl bg-stone-950 p-4 text-xs leading-6 text-amber-100">
                {JSON.stringify(handover, null, 2)}
              </pre>
            </div>
          ) : null}

          {automation ? (
            <div className="mb-6 rounded-[1.6rem] border border-emerald-300 bg-emerald-50 px-4 py-4 text-sm text-emerald-950 shadow-sm">
              <p className="font-semibold uppercase tracking-[0.18em] text-emerald-700">
                {copy.automationTitle}
              </p>
              <p className="mt-2">{copy.automationDescription}</p>
              <div className="mt-4 space-y-2 text-sm leading-6">
                <p>
                  <span className="font-semibold">{copy.automationLabels.tier}:</span>{" "}
                  {automation.tier}
                </p>
                <p>
                  <span className="font-semibold">{copy.automationLabels.notify}:</span>{" "}
                  {automation.notifyUrgent ? "true" : "false"}
                </p>
                <p>
                  <span className="font-semibold">{copy.automationLabels.validation}:</span>{" "}
                  {automation.validationReason ?? copy.acceptedLabel}
                </p>
                <p>
                  <span className="font-semibold">{copy.automationLabels.reasoning}:</span>{" "}
                  {automation.reasoning}
                </p>
              </div>
            </div>
          ) : null}

          {latestEventJson ? (
            <div className="mb-6 rounded-[1.6rem] border border-stone-700 bg-stone-900 px-4 py-4 text-sm text-stone-100 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">
                Full event {copy.jsonLabel}
              </p>
              <pre className="mt-3 max-h-80 overflow-auto rounded-2xl bg-stone-950 p-4 text-xs leading-6 text-amber-100">
                {JSON.stringify(latestEventJson, null, 2)}
              </pre>
            </div>
          ) : null}

          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-300">
            {copy.reviewTitle}
          </p>
          <h2 className="mt-3 font-serif text-2xl">{copy.pageTitle}</h2>
          <ul className="mt-5 space-y-3 text-sm leading-6 text-stone-300">
            {copy.reviewItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}
