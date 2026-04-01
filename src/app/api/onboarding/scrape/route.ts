/**
 * POST /api/onboarding/scrape — Extract services/hours from website URL.
 * Fetches the page HTML, extracts text content, and uses heuristics to
 * identify business services and operating hours.
 */

export const dynamic = "force-dynamic";

import { log } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { assertSameOrigin } from "@/lib/http/csrf";
import { checkRateLimit } from "@/lib/rate-limit";

/** Max HTML bytes to download (2 MB) */
const MAX_BYTES = 2 * 1024 * 1024;
/** Fetch timeout (8 seconds) */
const FETCH_TIMEOUT_MS = 8_000;

/**
 * Strip HTML tags and collapse whitespace to extract readable text.
 */
function htmlToText(html: string): string {
  // Remove script/style/noscript blocks
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ");
  // Remove HTML tags
  text = text.replace(/<[^>]+>/g, " ");
  // Decode common entities
  text = text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, " ");
  // Collapse whitespace
  text = text.replace(/\s+/g, " ").trim();
  return text;
}

/**
 * Extract potential business hours from page text using common patterns.
 */
function extractHours(text: string): string {
  const hoursPatterns = [
    // "Mon-Fri 9am-5pm" style
    /(?:hours|schedule|open|available)[:\s]*([^\n.]{10,120})/gi,
    // "Monday - Friday: 9:00 AM - 5:00 PM" style
    /((?:mon|tue|wed|thu|fri|sat|sun)[a-z]*\s*[-–to]+\s*(?:mon|tue|wed|thu|fri|sat|sun)[a-z]*\s*[:]\s*\d{1,2}[:\d]*\s*(?:am|pm)\s*[-–to]+\s*\d{1,2}[:\d]*\s*(?:am|pm))/gi,
    // "Open 24/7" or "24 hours"
    /(open\s+24\s*\/?\s*7|24\s+hours)/gi,
    // Time range patterns "8:00 AM - 6:00 PM"
    /(\d{1,2}(?::\d{2})?\s*(?:am|pm)\s*[-–to]+\s*\d{1,2}(?::\d{2})?\s*(?:am|pm))/gi,
  ];

  const matches: string[] = [];
  for (const pattern of hoursPatterns) {
    const found = text.match(pattern);
    if (found) {
      for (const m of found.slice(0, 3)) {
        const cleaned = m.trim().slice(0, 200);
        if (cleaned.length > 5 && !matches.includes(cleaned)) {
          matches.push(cleaned);
        }
      }
    }
  }

  return matches.slice(0, 5).join("; ") || "";
}

/**
 * Extract potential services from page text using common patterns.
 */
function extractServices(text: string): string {
  const servicesPatterns = [
    // "Services: ..." or "Our services include..."
    /(?:services|what we (?:do|offer)|specializ(?:e|ing))[:\s]*([^\n.]{10,300})/gi,
    // Lists after "we provide" or "we offer"
    /(?:we (?:provide|offer|specialize in))\s+([^\n.]{10,300})/gi,
  ];

  const matches: string[] = [];
  for (const pattern of servicesPatterns) {
    const found = text.match(pattern);
    if (found) {
      for (const m of found.slice(0, 3)) {
        const cleaned = m.trim().slice(0, 300);
        if (cleaned.length > 10 && !matches.includes(cleaned)) {
          matches.push(cleaned);
        }
      }
    }
  }

  // Also look for meta description as a fallback for services
  if (matches.length === 0) {
    const metaDescMatch = text.match(/(?:description|about\s+us)[:\s]*([^\n.]{20,300})/i);
    if (metaDescMatch) {
      matches.push(metaDescMatch[1].trim());
    }
  }

  return matches.slice(0, 3).join("; ") || "";
}

export async function POST(req: NextRequest) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  // Rate limit: 10 scrapes per minute per IP
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = await checkRateLimit(`onboarding_scrape:${ip}`, 10, 60000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
  }

  let body: { url?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const url = body.url?.trim();
  if (!url) return NextResponse.json({ error: "url required" }, { status: 400 });

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  // Only allow http/https
  if (!["http:", "https:"].includes(parsed.protocol)) {
    return NextResponse.json({ error: "Only HTTP/HTTPS URLs are supported" }, { status: 400 });
  }

  // Block private/internal IPs to prevent SSRF (IPv4 + IPv6)
  const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname === "::" ||
    hostname === "0.0.0.0" ||
    hostname.startsWith("10.") ||
    hostname.startsWith("172.") ||
    hostname.startsWith("192.168.") ||
    hostname.startsWith("fc") ||
    hostname.startsWith("fd") ||
    hostname.startsWith("fe80") ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".local") ||
    /^0+:0+:0+:0+:0+:(?:0+|ffff):/.test(hostname)
  ) {
    return NextResponse.json({ error: "Internal URLs are not allowed" }, { status: 400 });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const response = await fetch(parsed.toString(), {
      signal: controller.signal,
      headers: {
        "User-Agent": "RevenueOperator-Onboarding/1.0 (business-scraper)",
        Accept: "text/html,application/xhtml+xml,*/*",
      },
      redirect: "follow",
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return NextResponse.json(
        { services: "", hours: "", warning: `Website returned HTTP ${response.status}` },
      );
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      return NextResponse.json(
        { services: "", hours: "", warning: "URL does not appear to be an HTML page" },
      );
    }

    // Read limited bytes
    const reader = response.body?.getReader();
    if (!reader) {
      return NextResponse.json({ services: "", hours: "", warning: "Could not read response" });
    }

    const chunks: Uint8Array[] = [];
    let totalBytes = 0;
    while (totalBytes < MAX_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      totalBytes += value.length;
    }
    reader.cancel().catch((e: unknown) => {
      log("error", "reader.cancel() failed", {
        error: e instanceof Error ? e.message : String(e),
      });
    });

    const html = new TextDecoder("utf-8", { fatal: false }).decode(
      chunks.length === 1 ? chunks[0] : Buffer.concat(chunks),
    );

    const pageText = htmlToText(html);
    const services = extractServices(pageText);
    const hours = extractHours(pageText);

    // Also try to extract from meta tags
    let metaServices = services;
    if (!metaServices) {
      const descMatch = html.match(/<meta\s+(?:name|property)=["'](?:description|og:description)["']\s+content=["']([^"']{10,300})["']/i);
      if (descMatch) {
        metaServices = descMatch[1].trim();
      }
    }

    return NextResponse.json({
      services: metaServices || "",
      hours: hours || "",
      url: parsed.toString(),
      text_length: pageText.length,
    });
  } catch (err) {
    const isAbort = err instanceof Error && err.name === "AbortError";
    return NextResponse.json({
      services: "",
      hours: "",
      warning: isAbort ? "Website took too long to respond" : "Could not fetch website",
    });
  }
}
