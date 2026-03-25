/**
 * GET /api/build-id
 * Returns current build/deploy identifier for stale-cache detection.
 * Set BUILD_ID or VERCEL_GIT_COMMIT_SHA in production so clients can prompt refresh after deploy.
 */

export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

const BUILD_ID =
  process.env.BUILD_ID ??
  process.env.VERCEL_GIT_COMMIT_SHA ??
  process.env.VERCEL_GIT_COMMIT_REF ??
  "development";

export async function GET() {
  const res = NextResponse.json({ buildId: BUILD_ID });
  res.headers.set("Cache-Control", "no-store, must-revalidate");
  return res;
}
