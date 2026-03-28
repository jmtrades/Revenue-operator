/**
 * GET /api/voices — Voice library API.
 *
 * Returns curated voice profiles for the voice selector UI.
 *
 * Query params:
 *   industry - Filter/sort by industry (e.g. "dental", "hvac")
 *   search   - Text search across name, tags, personality, accent
 *   gender   - Filter by "female" | "male" | "neutral"
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import {
  VOICE_LIBRARY,
  getVoicesForIndustry,
  searchVoices,
  getRecommendedVoice,
} from "@/lib/voice/voice-library";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const industry = searchParams.get("industry");
  const search = searchParams.get("search");
  const gender = searchParams.get("gender");

  let voices = VOICE_LIBRARY;

  // Industry sorting
  if (industry) {
    voices = getVoicesForIndustry(industry);
  }

  // Text search
  if (search) {
    voices = searchVoices(search);
  }

  // Gender filter
  if (gender && (gender === "female" || gender === "male" || gender === "neutral")) {
    voices = voices.filter((v) => v.gender === gender);
  }

  // Only return available voices
  voices = voices.filter((v) => v.available);

  const recommended = industry ? getRecommendedVoice(industry) : null;

  return NextResponse.json({
    voices,
    recommended: recommended ? recommended.id : null,
    total: voices.length,
  });
}
