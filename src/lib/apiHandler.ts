import { NextRequest, NextResponse } from "next/server";
import { log } from "@/lib/logger";

type Handler = (
  req: NextRequest,
  ctx: { params: Promise<Record<string, string>> }
) => Promise<Response>;

/**
 * Wraps an API route handler with global error handling.
 * Logs errors and returns a generic 500 response without exposing internal details.
 */
export function withErrorHandling(handler: Handler): Handler {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      log("error", `[API Error] ${req.method} ${req.url}`, { error: err instanceof Error ? err.message : String(err) });
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  };
}
