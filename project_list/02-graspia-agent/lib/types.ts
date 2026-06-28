export type ChatRole = "assistant" | "user" | "system";

export type LanguageCode = "en" | "th";

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

export type HandoverReason =
  | "angry_client"
  | "unknown_question"
  | "ready_to_buy"
  | "asked_for_human"
  | "uncertainty_loop"
  | "none";

export type HandoverEvent = {
  handover: true;
  reason: Exclude<HandoverReason, "none">;
  summary: string;
  confidence: number;
};

export type LeadTemperature = "hot" | "warm" | "cold";

export type AutomationEvent = {
  accepted: boolean;
  rejected: boolean;
  tier: LeadTemperature;
  reasoning: string;
  autoReply: string;
  notifyUrgent: boolean;
  notificationSent?: boolean;
  notificationChannel: string;
  validationReason: string | null;
  leadRecordId?: string | null;
};

export type AgentDecision = {
  answer: string;
  confidence: number;
  shouldHandover: boolean;
  handoverReason: HandoverReason;
  handoverSummary: string;
  detectedLanguage: "en" | "th";
  preferredLanguage: LanguageCode;
  lead: {
    name: string | null;
    email: string | null;
    phone: string | null;
    preferredContact: string | null;
    notes: string | null;
  };
};

export type BusinessProfile = {
  business_name: string;
  industry: string;
  country: string;
  languages: string[];
  about: string;
  products: Array<{
    name: string;
    price_thb: number;
    good_for: string;
    saves_per_month_thb: string;
    warranty_years: number;
  }>;
  process: string[];
  payment: string;
  service_area: string;
  rules: string[];
  human_team: {
    sales_contact: string;
    handover_hours: string;
  };
};
