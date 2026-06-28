"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import type { Listing, MatchResult } from "@/lib/types";

type Language = "en" | "th";

const COPY = {
  en: {
    languageName: "English",
    switchLabel: "Language",
    heroTag: "AI Property Matching",
    heroTitle: "Find the best-fit property with a plain-language search.",
    heroBody:
      "Buyers can describe what they want naturally, and the app returns three ranked listings with specific reasons.",
    searchLabel: "Describe what you are looking for",
    searchPlaceholder: "Describe the property you want...",
    exampleLabel: "Try example",
    exampleButtonText: "Example",
    buttonIdle: "Find matches",
    buttonLoading: "Matching...",
    dataTitle: "Data Snapshot",
    dataBody: "Listings seeded into PostgreSQL and available through the API.",
    endpointLabel: "Endpoint",
    bonusLabel: "Bonus",
    bonusBody: "Prompt cache to reduce repeat AI calls",
    resultsLabel: "Results",
    resultsTitleEmpty: "Available listings",
    resultsTitleMatches: "Top matches",
    resultsBodyEmpty: "Showing all seeded listings",
    resultsBodyMatches: "AI-ranked matches with reasons",
    loadingListings: "...",
    cards: {
      bed: "bed",
      bath: "bath",
      sqm: "sqm",
    },
    exampleRequests: [
      "I want a 2-bedroom condo near BTS in Bangkok under 6 million baht for my family",
      "Somewhere nice and cheap in Chiang Mai",
      "บ้านหรู ใกล้รถไฟฟ้า ในกรุงเทพ สำหรับครอบครัว",
    ],
    translations: [
      "TH",
      "EN",
    ],
  },
  th: {
    languageName: "ไทย",
    switchLabel: "ภาษา",
    heroTag: "จับคู่คอนโดและบ้านด้วย AI",
    heroTitle: "ค้นหาทรัพย์ที่เหมาะที่สุดจากคำอธิบายแบบภาษาธรรมชาติ",
    heroBody:
      "ผู้ใช้พิมพ์ความต้องการแบบสบาย ๆ ได้เลย แล้วระบบจะจัดเรียงตัวเลือก 3 รายการพร้อมเหตุผลที่ชัดเจน",
    searchLabel: "บอกสิ่งที่คุณกำลังมองหา",
    searchPlaceholder: "อธิบายทรัพย์ที่คุณต้องการ...",
    exampleLabel: "ลองตัวอย่าง",
    exampleButtonText: "ตัวอย่าง",
    buttonIdle: "ค้นหาที่ตรงใจ",
    buttonLoading: "กำลังค้นหา...",
    dataTitle: "ภาพรวมข้อมูล",
    dataBody: "ข้อมูลตัวอย่างถูกบันทึกใน PostgreSQL และพร้อมใช้งานผ่าน API",
    endpointLabel: "เอ็นด์พอยต์",
    bonusLabel: "โบนัส",
    bonusBody: "มีแคชคำค้นเพื่อลดการเรียก AI ซ้ำ",
    resultsLabel: "ผลลัพธ์",
    resultsTitleEmpty: "รายการทั้งหมด",
    resultsTitleMatches: "รายการที่ตรงที่สุด",
    resultsBodyEmpty: "แสดงรายการตัวอย่างทั้งหมด",
    resultsBodyMatches: "จัดอันดับด้วย AI พร้อมเหตุผล",
    loadingListings: "...",
    cards: {
      bed: "ห้องนอน",
      bath: "ห้องน้ำ",
      sqm: "ตร.ม.",
    },
    exampleRequests: [
      "ต้องการคอนโด 2 ห้องนอน ใกล้ BTS ในกรุงเทพ งบไม่เกิน 6 ล้าน สำหรับครอบครัว",
      "ที่อยู่ดี ๆ ราคาไม่แพง ในเชียงใหม่",
      "บ้านหรู ใกล้รถไฟฟ้า ในกรุงเทพ สำหรับครอบครัว",
    ],
    translations: [
      "EN",
      "TH",
    ],
  },
} as const;

// Picks the first language from local storage or the browser preference.
function getInitialLanguage() {
  if (typeof window === "undefined") {
    return "en";
  }

  const savedLanguage = window.localStorage.getItem("property-language");
  if (savedLanguage === "th" || savedLanguage === "en") {
    return savedLanguage;
  }

  return navigator.language.toLowerCase().startsWith("th") ? "th" : "en";
}

// Formats prices for display in Thai baht.
function formatPrice(price: number, language: Language) {
  return new Intl.NumberFormat(language === "th" ? "th-TH" : "en-US", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  }).format(price);
}

// Renders one listing card with the image, facts, and match reason.
function ListingCard({
  listing,
  reason,
  language,
}: {
  listing: Listing;
  reason?: string;
  language: Language;
}) {
  const copy = COPY[language];

  return (
    <article className="overflow-hidden rounded-[28px] border border-[var(--line)] bg-[var(--card)] shadow-[0_16px_50px_rgba(68,44,13,0.08)]">
      <Image
        src={listing.image}
        alt={listing.title}
        width={600}
        height={400}
        unoptimized
        className="h-52 w-full object-cover"
      />
      <div className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
              {listing.city} . {listing.area}
            </p>
            <h3 className="mt-2 text-xl font-semibold">{listing.title}</h3>
          </div>
          <div className="rounded-full bg-[rgba(201,109,66,0.12)] px-3 py-1 text-sm font-semibold text-[var(--accent-deep)]">
            {listing.type}
          </div>
        </div>

        <p className="text-2xl font-semibold">
          {formatPrice(listing.price, language)}
        </p>

        <div className="flex flex-wrap gap-2 text-sm text-[var(--muted)]">
          <span className="rounded-full border border-[var(--line)] px-3 py-1">
            {listing.bedrooms} {copy.cards.bed}
          </span>
          <span className="rounded-full border border-[var(--line)] px-3 py-1">
            {listing.bathrooms} {copy.cards.bath}
          </span>
          <span className="rounded-full border border-[var(--line)] px-3 py-1">
            {listing.size_sqm} {copy.cards.sqm}
          </span>
        </div>

        <p className="text-sm text-[var(--muted)]">{listing.near_transit}</p>
        <p className="text-sm leading-6 text-[var(--muted)]">{listing.description}</p>

        {reason ? (
          <div className="rounded-2xl bg-[rgba(201,109,66,0.08)] p-4 text-sm leading-6 text-[var(--foreground)]">
            {reason}
          </div>
        ) : null}
      </div>
    </article>
  );
}

// Renders the search page and wires the listing and match requests together.
export default function Home() {
  const [language, setLanguage] = useState<Language>(() => getInitialLanguage());
  const [query, setQuery] = useState<string>(
    () =>
      (getInitialLanguage() === "th"
        ? COPY.th.exampleRequests[0]
        : COPY.en.exampleRequests[0]),
  );
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [allListings, setAllListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingListings, setLoadingListings] = useState(true);
  const [error, setError] = useState("");

  const copy = COPY[language];
  const displayedCards: Array<{ listing: Listing; reason?: string }> =
    matches.length > 0
      ? matches
      : allListings.map((listing) => ({
          listing,
          reason: undefined,
        }));

  useEffect(() => {
    document.documentElement.lang = language === "th" ? "th" : "en";
    window.localStorage.setItem("property-language", language);
  }, [language]);

  useEffect(() => {
    const loadListings = async () => {
      try {
        const response = await fetch("/api/listings");
        const data = (await response.json()) as { listings: Listing[] };
        setAllListings(data.listings);
      } catch {
        setError(language === "th" ? "ไม่สามารถโหลดรายการได้" : "Could not load listings.");
      } finally {
        setLoadingListings(false);
      }
    };

    void loadListings();
  }, [language]);

  const handleMatch = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/match", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ request: query, language }),
      });

      const data = (await response.json()) as {
        error?: string;
        matches?: MatchResult[];
      };

      if (!response.ok) {
        throw new Error(data.error || "Something went wrong.");
      }

      setMatches(data.matches ?? []);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : language === "th"
            ? "ไม่สามารถจับคู่รายการได้"
            : "Could not match listings.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-6 sm:px-8 lg:px-12">
      <section className="grid gap-8 rounded-[36px] border border-[var(--line)] bg-[rgba(255,250,242,0.82)] p-6 shadow-[0_24px_80px_rgba(84,53,24,0.08)] backdrop-blur md:grid-cols-[minmax(0,1.55fr)_minmax(300px,360px)] md:p-8">
        <div className="min-w-0 space-y-6">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm uppercase tracking-[0.28em] text-[var(--accent-deep)]">
              {copy.heroTag}
            </p>
            <div className="flex rounded-full border border-[var(--line)] bg-white/70 p-1 text-sm">
              <span className="px-3 py-1 text-[var(--muted)]">{copy.switchLabel}</span>
              {(["en", "th"] as Language[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setLanguage(option)}
                  className={`rounded-full px-3 py-1 font-semibold transition ${
                    language === option
                      ? "bg-[var(--accent)] text-white"
                      : "text-[var(--muted)] hover:text-[var(--accent-deep)]"
                  }`}
                >
                  {option.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h1 className="max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
              {copy.heroTitle}
            </h1>
            <p className="max-w-xl text-base leading-7 text-[var(--muted)] sm:text-lg">
              {copy.heroBody}
            </p>
          </div>

          <div className="rounded-[28px] bg-white/75 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
            <label htmlFor="property-query" className="sr-only">
              {copy.searchLabel}
            </label>
            <textarea
              id="property-query"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              rows={4}
              className="w-full resize-none rounded-2xl border border-[var(--line)] bg-[#fffdf9] p-4 outline-none transition focus:border-[var(--accent)]"
              placeholder={copy.searchPlaceholder}
            />

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-2">
                {copy.exampleRequests.map((example, index) => (
                  <button
                    key={example}
                    type="button"
                    onClick={() => setQuery(example)}
                    title={example}
                    className="rounded-full border border-[var(--line)] px-3 py-2 text-sm text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--accent-deep)]"
                  >
                    {copy.exampleButtonText} {index + 1}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={handleMatch}
                disabled={loading}
                className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--accent-deep)] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? copy.buttonLoading : copy.buttonIdle}
              </button>
            </div>
          </div>

          {error ? (
            <p className="rounded-2xl border border-[rgba(153,58,32,0.16)] bg-[rgba(153,58,32,0.08)] px-4 py-3 text-sm text-[#7c2d12]">
              {error}
            </p>
          ) : null}
        </div>

        <div className="grid gap-4 rounded-[28px] bg-[#2a211c] p-5 text-[#f7efe6] md:sticky md:top-6 md:self-start">
          <div>
            <p className="text-sm uppercase tracking-[0.28em] text-[#f3bf98]">
              {copy.dataTitle}
            </p>
            <p className="mt-3 text-3xl font-semibold">
              {loadingListings ? copy.loadingListings : allListings.length}
            </p>
            <p className="mt-2 text-sm leading-6 text-[#d3c4b5]">
              {copy.dataBody}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-1">
            <div className="rounded-2xl border border-white/10 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-[#cdb7a0]">
                {copy.endpointLabel}
              </p>
              <p className="mt-2 text-sm">GET /api/listings</p>
            </div>
            <div className="rounded-2xl border border-white/10 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-[#cdb7a0]">
                {copy.endpointLabel}
              </p>
              <p className="mt-2 text-sm">POST /api/match</p>
            </div>
            <div className="rounded-2xl border border-white/10 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-[#cdb7a0]">
                {copy.bonusLabel}
              </p>
              <p className="mt-2 text-sm">{copy.bonusBody}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-[var(--accent-deep)]">
              {copy.resultsLabel}
            </p>
            <h2 className="mt-2 text-2xl font-semibold">
              {matches.length > 0
                ? copy.resultsTitleMatches
                : copy.resultsTitleEmpty}
            </h2>
          </div>
          <p className="text-sm text-[var(--muted)]">
            {matches.length > 0
              ? copy.resultsBodyMatches
              : copy.resultsBodyEmpty}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {displayedCards.map(({ listing, reason }) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              reason={reason}
              language={language}
            />
          ))}
        </div>
      </section>
    </main>
  );
}
