/**
 * Admin event tracking endpoint (POST): accepts page events and stores in page_events table.
 * No auth required (public tracking endpoint).
 * Rate limited by IP (simple in-memory check).
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { assertSameOrigin } from "@/lib/http/csrf";

// Simple in-memory rate limiter: IP -> timestamp of last request
const ipLastRequestMap: Map<string, number> = new Map();
const RATE_LIMIT_WINDOW_MS = 1000; // 1 second
const MAX_REQUESTS_PER_WINDOW = 10;

function getRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const lastTime = ipLastRequestMap.get(ip) || 0;

  if (now - lastTime > RATE_LIMIT_WINDOW_MS) {
    ipLastRequestMap.set(ip, now);
    return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - 1 };
  }

  if (ipLastRequestMap.has(ip)) {
    const count = (ipLastRequestMap.get(ip) as unknown as number) + 1;
    if (count >= MAX_REQUESTS_PER_WINDOW) {
      return { allowed: false, remaining: 0 };
    }
    ipLastRequestMap.set(ip, count as any);
    return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - count };
  }

  return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - 1 };
}

export async function POST(req: NextRequest) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  // Get client IP from headers
  const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";

  // Check rate limit
  const rateLimit = getRateLimit(clientIp);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const {
    event_name,
    event_category,
    page_url,
    referrer,
    utm_source,
    utm_medium,
    utm_campaign,
    properties,
    session_id,
  } = body;

  if (!event_name) {
    return NextResponse.json({ error: "event_name is required" }, { status: 400 });
  }

  const db = getDb();

  try {
    const { error } = await db.from("page_events").insert({
      event_name,
      event_category: event_category || null,
      page_url: page_url || null,
      referrer: referrer || null,
      utm_source: utm_source || null,
      utm_medium: utm_medium || null,
      utm_campaign: utm_campaign || null,
      properties: properties || null,
      session_id: session_id || null,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error("[admin/track]", error);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      rate_limit_remaining: rateLimit.remaining,
    });
  } catch (err: any) {
    console.error("[admin/track catch]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
