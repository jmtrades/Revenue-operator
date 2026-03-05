/**
 * GET /api/agent/voices — List ElevenLabs voices (when ELEVENLABS_API_KEY is set).
 * Public so onboarding/activate can show voice picker without session.
 */

export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({ voices: [] });
  }

  try {
    const res = await fetch("https://api.elevenlabs.io/v1/voices", {
      headers: { "xi-api-key": apiKey },
    });
    if (!res.ok) return NextResponse.json({ voices: [] });

    const data = (await res.json()) as {
      voices?: Array<{
        voice_id?: string;
        name?: string;
        labels?: Record<string, string>;
        category?: string;
      }>;
    };
    const list = data.voices ?? [];
    const voices = list
      .filter((v) => v.voice_id && v.name)
      .map((v) => ({
        id: v.voice_id as string,
        name: (v.name as string).trim(),
        labels: v.labels ?? {},
        category: v.category ?? "premade",
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "en"));

    return NextResponse.json({ voices });
  } catch {
    return NextResponse.json({ voices: [] });
  }
}
