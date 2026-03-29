/**
 * POST /api/templates/activate — DEPRECATED
 *
 * This endpoint is deprecated. Use POST /api/industry-templates/[slug]/apply instead.
 * That endpoint provides template variable substitution and selective section apply.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  return NextResponse.json(
    {
      error: "Deprecated endpoint",
      message: "Use POST /api/industry-templates/[slug]/apply instead",
    },
    { status: 410 }
  );
}
