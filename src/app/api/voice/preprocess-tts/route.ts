/**
 * POST /api/voice/preprocess-tts — Called by the voice server before every TTS call.
 *
 * Applies pronunciation corrections, number formatting, and SSML enhancements
 * to the raw LLM output before sending it to Deepgram Aura for synthesis.
 *
 * This is what makes the voice say "Doctor Smith on Boulevard" instead of
 * "Dr. Smith on Blvd" — critical for natural phone conversations.
 *
 * Security: Verifies voice webhook secret in Authorization header.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { createHmac, timingSafeEqual } from "crypto";
import {
  applyPronunciationRules,
  COMMON_PRONUNCIATION_FIXES,
  type PronunciationEntry,
} from "@/lib/voice/pronunciation";
import { log } from "@/lib/logger";

function verifyWebhookSecret(body: string, authHeader: string | null): boolean {
  const secret = process.env.VOICE_WEBHOOK_SECRET;
  if (!secret) {
    const isProduction = process.env.NODE_ENV === "production";
    if (isProduction) {
      log("error", "voice_preprocess_tts.secret_not_configured", { message: "rejecting webhook — VOICE_WEBHOOK_SECRET must be set in production" });
      return false;
    }
    log("warn", "voice_preprocess_tts.secret_not_configured", { message: "skipping signature verification in development" });
    return true;
  }

  if (!authHeader) {
    log("error", "voice_preprocess_tts.missing_auth_header", { message: "Authorization header required" });
    return false;
  }

  // Expected format: "Bearer <signature>"
  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    log("error", "voice_preprocess_tts.invalid_auth_format", { message: "Invalid Authorization header format" });
    return false;
  }
  const signature = parts[1];

  const expected = createHmac("sha256", secret)
    .update(body, "utf-8")
    .digest("hex");

  if (expected.length !== signature.length) return false;
  try {
    return timingSafeEqual(Buffer.from(expected, "utf-8"), Buffer.from(signature, "utf-8"));
  } catch {
    return expected === signature;
  }
}

interface PreprocessTTSBody {
  workspace_id: string;
  text: string;
  /** Context hint for how to style the speech */
  context?: "greeting" | "readback" | "empathetic" | "closing" | "normal";
}

/**
 * Format phone numbers for natural speech: "5551234567" → "5-5-5... 1-2-3... 4-5-6-7"
 */
function formatPhoneForSpeech(text: string): string {
  return text.replace(
    /\b(\d{3})[-.]?(\d{3})[-.]?(\d{4})\b/g,
    (_match, area: string, prefix: string, line: string) => {
      const a = area.split("").join("-");
      const p = prefix.split("").join("-");
      const l = line.split("").join("-");
      return `${a}... ${p}... ${l}`;
    },
  );
}

/**
 * Format dates for natural speech: "2026-03-21" → "March 21st, 2026"
 */
function formatDateForSpeech(text: string): string {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  return text.replace(
    /\b(\d{4})-(\d{2})-(\d{2})\b/g,
    (_match, year: string, month: string, day: string) => {
      const m = parseInt(month, 10);
      const d = parseInt(day, 10);
      const monthName = months[m - 1] ?? month;
      const suffix =
        d === 1 || d === 21 || d === 31
          ? "st"
          : d === 2 || d === 22
            ? "nd"
            : d === 3 || d === 23
              ? "rd"
              : "th";
      return `${monthName} ${d}${suffix}, ${year}`;
    },
  );
}

/**
 * Format times for natural speech: "14:30" → "2:30 PM"
 */
function formatTimeForSpeech(text: string): string {
  return text.replace(
    /\b(\d{1,2}):(\d{2})\b/g,
    (_match, hours: string, minutes: string) => {
      const h = parseInt(hours, 10);
      if (h > 23) return _match; // Not a time
      const period = h >= 12 ? "PM" : "AM";
      const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
      return `${displayHour}:${minutes} ${period}`;
    },
  );
}

/**
 * Format dollar amounts for natural speech: "$1500" → "fifteen hundred dollars"
 */
function formatCurrencyForSpeech(text: string): string {
  return text.replace(
    /\$(\d+(?:,\d{3})*(?:\.\d{1,2})?)/g,
    (_match, amount: string) => {
      const num = parseFloat(amount.replace(/,/g, ""));
      if (isNaN(num)) return _match;
      if (num < 100) return `${num} dollars`;
      // Format with commas for readability, add "dollars"
      const formatted = num.toLocaleString("en-US");
      return `${formatted} dollars`;
    },
  );
}

/**
 * Add natural pauses before important information using SSML breaks.
 */
function addNaturalPauses(text: string, context?: string): string {
  // Add pause before readback of important info
  if (context === "readback") {
    // Pause before numbers, dates, and names in readback mode
    return text
      .replace(/(\b(?:at|on|for)\b)\s+/gi, "$1... ")
      .replace(/(\b(?:your|the)\b)\s+(appointment|booking|reservation)/gi, "$1 $2");
  }

  return text;
}

export async function POST(req: NextRequest) {
  // Verify webhook signature
  const body = await req.text();
  const authHeader = req.headers.get("Authorization");

  if (!verifyWebhookSecret(body, authHeader)) {
    log("error", "voice_preprocess_tts.invalid_signature", { message: "signature verification failed" });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: PreprocessTTSBody;
  try {
    payload = JSON.parse(body) as PreprocessTTSBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { workspace_id, text, context } = payload;

  if (!workspace_id || typeof workspace_id !== "string" || !text || typeof text !== "string") {
    return NextResponse.json(
      { error: "workspace_id and text are required" },
      { status: 400 },
    );
  }

  // Sanitize: cap text length to prevent abuse (10KB max — more than enough for any TTS chunk)
  const sanitizedText = text.slice(0, 10_000);

  try {
    // 1. Load workspace pronunciation dictionary (if any)
    let dictionary: PronunciationEntry[] = [...COMMON_PRONUNCIATION_FIXES];

    const db = getDb();
    const { data: workspace } = await db
      .from("workspaces")
      .select("pronunciation_dictionary")
      .eq("id", workspace_id)
      .maybeSingle();

    if (workspace) {
      const ws = workspace as { pronunciation_dictionary?: PronunciationEntry[] | null };
      if (ws.pronunciation_dictionary && Array.isArray(ws.pronunciation_dictionary)) {
        dictionary = [...ws.pronunciation_dictionary, ...COMMON_PRONUNCIATION_FIXES];
      }
    }

    // 2. Apply pronunciation rules
    let processed = applyPronunciationRules(sanitizedText, dictionary);

    // 3. Format phone numbers for natural speech
    processed = formatPhoneForSpeech(processed);

    // 4. Format dates for natural speech
    processed = formatDateForSpeech(processed);

    // 5. Format times for natural speech
    processed = formatTimeForSpeech(processed);

    // 6. Format currency for natural speech
    processed = formatCurrencyForSpeech(processed);

    // 7. Add natural pauses based on context
    processed = addNaturalPauses(processed, context);

    log("info", "voice.preprocess_tts", {
      workspace_id,
      original_length: sanitizedText.length,
      processed_length: processed.length,
      context: context ?? "normal",
    });

    return NextResponse.json({
      ok: true,
      text: processed,
      original: sanitizedText,
      modifications_applied: processed !== sanitizedText,
    });
  } catch (err) {
    log("error", "voice.preprocess_tts_error", {
      error: err instanceof Error ? err.message : String(err),
    });
    // On error, return original text — never block TTS
    return NextResponse.json({
      ok: true,
      text: sanitizedText,
      original: sanitizedText,
      modifications_applied: false,
    });
  }
}
