import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";
import { assertSameOrigin } from "@/lib/http/csrf";
import { createCipheriv, randomBytes } from "crypto";
import { log } from "@/lib/logger";

const ENCRYPTION_KEY = process.env.PORT_PIN_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY || "";
const ENCRYPTION_VERSION = 1;

/** Encrypt a PIN using AES-256-GCM. Returns base64 string of iv:authTag:ciphertext. */
function encryptPin(pin: string): string {
  if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length < 16) {
    throw new Error("PIN encryption key not configured");
  }
  const key = Buffer.from(ENCRYPTION_KEY.padEnd(32, "0").slice(0, 32), "utf-8");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(pin, "utf-8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted.toString("base64")}`;
}

export async function POST(req: NextRequest) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;


  try {
    const session = await getSession(req);
    if (!session?.workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const authErr = await requireWorkspaceAccess(req, session.workspaceId);
    if (authErr) return authErr;

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const {
      phone_number,
      current_carrier,
      account_number,
      account_pin,
      loa_url,
      contact_name,
      contact_email,
    } = body as {
      phone_number?: string;
      current_carrier?: string;
      account_number?: string;
      account_pin?: string;
      loa_url?: string;
      contact_name?: string;
      contact_email?: string;
    };

    if (!phone_number || !current_carrier) {
      return NextResponse.json({ error: "Phone number and carrier required" }, { status: 400 });
    }

    const db = getDb();

    // Encrypt the PIN — never store plaintext
    const encryptedPin = account_pin ? encryptPin(account_pin) : null;

    const { data, error } = await db
      .from("port_requests")
      .insert({
        workspace_id: session.workspaceId,
        phone_number,
        current_carrier,
        account_number: account_number || null,
        account_pin: null, // Never store plaintext
        account_pin_encrypted: encryptedPin,
        encryption_version: encryptedPin ? ENCRYPTION_VERSION : null,
        loa_url: loa_url || null,
        contact_name: contact_name || null,
        contact_email: contact_email || null,
        status: "pending",
      })
      .select("id, phone_number, current_carrier, status, created_at")
      .maybeSingle();

    if (error) {
      log("error", "[port-request] DB error:", { error: error instanceof Error ? error.message : String(error) });
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    log("error", "[port-request] Unexpected error:", { error: err instanceof Error ? err.message : err });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

