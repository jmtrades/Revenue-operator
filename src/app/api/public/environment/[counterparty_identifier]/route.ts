/**
 * GET /api/public/environment/[counterparty_identifier]
 * Returns participation_state and outstanding_dependencies. No product messaging.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getPublicEnvironmentState } from "@/lib/counterparty-participation";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ counterparty_identifier: string }> }
) {
  const { counterparty_identifier } = await params;
  const raw = counterparty_identifier ? decodeURIComponent(counterparty_identifier) : "";
  const state = await getPublicEnvironmentState(raw);
  return NextResponse.json({
    participation_state: state.participation_state,
    outstanding_dependencies: state.outstanding_dependencies,
  });
}
