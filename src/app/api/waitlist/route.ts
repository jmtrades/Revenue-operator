/**
 * Waitlist signup route
 * Public endpoint for collecting email signups with rate limiting
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";

// Simple in-memory rate limiting: Map<email, timestamp>
const rateLimitMap = new Map<string, number>();

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function checkRateLimit(email: string): boolean {
  const now = Date.now();
  const lastSubmission = rateLimitMap.get(email);

  // If no previous submission or more than 1 hour has passed, allow
  if (!lastSubmission || now - lastSubmission > 60 * 60 * 1000) {
    rateLimitMap.set(email, now);
    return true;
  }

  return false;
}

export async function POST(req: NextRequest) {
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

    // Check rate limit
    if (!checkRateLimit(normalizedEmail)) {
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
