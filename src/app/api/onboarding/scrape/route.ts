/**
 * POST /api/onboarding/scrape — Extract services/hours from website URL.
 * Returns empty services/hours for now; scraper can be added later.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  let body: { url?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const url = body.url?.trim();
  if (!url) return NextResponse.json({ error: "url required" }, { status: 400 });
  try {
    new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }
  return NextResponse.json({ services: "", hours: "" });
}
