import { NextRequest, NextResponse } from "next/server";

type Handler = (
  req: NextRequest,
  ctx?: { params: Promise<Record<string, string>> }
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
      console.error(`[API Error] ${req.method} ${req.url}:`, err);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  };
}
