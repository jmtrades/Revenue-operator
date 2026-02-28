import { NextRequest } from "next/server";
import crypto from "crypto";
import { getDb } from "@/lib/db/queries";

function getEnv(name: string): string | null {
  try {
    const value = process.env[name];
    return value && value.length > 0 ? value : null;
  } catch {
    return null;
  }
}

export function getReferrerDomain(request: NextRequest): string | null {
  const ref = request.headers.get("referer") || request.headers.get("referrer");
  if (!ref) return null;
  try {
    const url = new URL(ref);
    return url.hostname || null;
  } catch {
    return null;
  }
}

export function getDaySalt(): string | null {
  const base = getEnv("PUBLIC_VIEW_SALT");
  if (!base) return null;
  const today = new Date();
  const day = today.toISOString().slice(0, 10); // YYYY-MM-DD
  return `${base}:${day}`;
}

export function hashViewerFingerprint(request: NextRequest, daySalt: string | null): string | null {
  if (!daySalt) return null;
  try {
    const acceptLanguage = request.headers.get("accept-language") || "";
    const ua = request.headers.get("user-agent") || "";
    const chUa = request.headers.get("sec-ch-ua") || "";
    const input = [acceptLanguage, ua, chUa].join("|");
    if (!input.trim()) return null;
    const h = crypto.createHash("sha256");
    h.update(daySalt);
    h.update(input);
    return h.digest("hex").slice(0, 80);
  } catch {
    return null;
  }
}

export async function recordPublicView(
  workspaceId: string,
  externalRef: string,
  request: NextRequest
): Promise<{ ok: boolean }> {
  try {
    const db = getDb();
    const daySalt = getDaySalt();
    const viewer_fingerprint_hash = hashViewerFingerprint(request, daySalt);
    const referrer_domain = getReferrerDomain(request);
    const country_codeHeader = request.headers.get("x-country-code") || null;
    const country_code = country_codeHeader && country_codeHeader.length <= 8 ? country_codeHeader : null;

    await db.from("public_record_views").insert({
      workspace_id: workspaceId,
      external_ref: externalRef,
      viewer_fingerprint_hash,
      referrer_domain,
      country_code,
    });

    return { ok: true };
  } catch {
    return { ok: false };
  }
}

