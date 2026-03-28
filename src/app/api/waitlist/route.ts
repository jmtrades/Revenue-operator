/**
 * Waitlist signup route
 * Public endpoint for collecting email signups with rate limiting
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { assertSameOrigin } from "@/lib/http/csrf";

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export async function POST(req: NextRequest) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  try {
    const body = await req.json();
    const { email } = body;

    // Validate email format
    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!isValidEmail(normalizedEmail)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Distributed rate limit: 5 per hour per IP + 1 per hour per email
    const ip = getClientIp(req);
    const ipRl = await checkRateLimit(`waitlist:ip:${ip}`, 5, 3600_000);
    if (!ipRl.allowed) {
      return NextResponse.json(
        { error: "Too many submissions. Try again later." },
        { status: 429 }
      );
    }
    const emailRl = await checkRateLimit(`waitlist:email:${normalizedEmail}`, 1, 3600_000);
    if (!emailRl.allowed) {
      return NextResponse.json(
        { error: "Too many submissions from this email. Try again later." },
        { status: 429 }
      );
    }

    // Get database client
    const db = getDb();

    // Insert into waitlist_signups table
    const { data, error } = await db
      .from("waitlist_signups")
      .insert([
        {
          email: normalizedEmail,
          source: "website",
          created_at: new Date().toISOString(),
        },
      ])
      .select();

    if (error) {
      // If it's a unique constraint violation, return 409 Conflict
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Email already registered" },
          { status: 409 }
        );
      }
      throw error;
    }

    return NextResponse.json(
      { message: "Successfully added to waitlist", data },
      { status: 200 }
    );
  } catch (error) {
    console.error("[API] waitlist route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
