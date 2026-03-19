/**
 * GET /api/industry-templates
 * Returns all industry templates (public endpoint, no auth required)
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";

export async function GET(_req: NextRequest) {
  try {
    const db = getDb();

    const { data, error } = await db
      .from("industry_templates")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      templates: data || [],
      count: (data || []).length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
