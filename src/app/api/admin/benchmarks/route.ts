/**
 * Admin benchmarks route: read from benchmark_aggregates table with query support.
 * Query params: industry, metric, period
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { isAdmin, forbidden } from "@/lib/admin/auth";
import { getDb } from "@/lib/db/queries";
import { log } from "@/lib/logger";

export async function GET(req: NextRequest) {
  if (!(await isAdmin(req))) {
    return forbidden();
  }

  const db = getDb();
  const url = new URL(req.url);
  const industry = url.searchParams.get("industry")?.toString();
  const metric = url.searchParams.get("metric")?.toString();
  const period = url.searchParams.get("period")?.toString();

  let query = db.from("benchmark_aggregates").select("*");

  if (industry) {
    query = query.eq("industry", industry);
  }

  if (metric) {
    query = query.eq("metric_name", metric);
  }

  if (period) {
    query = query.eq("period", period);
  }

  try {
    const { data, error } = await query;

    if (error) {
      log("error", "[admin/benchmarks]", { error: error });
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }

    return NextResponse.json({
      count: (data ?? []).length,
      data: data ?? [],
      filters: {
        industry: industry || null,
        metric: metric || null,
        period: period || null,
      },
    });
  } catch (err: unknown) {
    log("error", "[admin/benchmarks catch]", { error: err });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
