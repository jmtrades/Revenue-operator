/**
 * GET /api/industry-templates/[slug]
 * Returns a single industry template by slug (public endpoint, no auth required)
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";

interface Params {
  slug: string;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  try {
    const { slug } = await params;

    if (!slug) {
      return NextResponse.json(
        { error: "Slug parameter is required" },
        { status: 400 }
      );
    }

    const db = getDb();

    const { data, error } = await db
      .from("industry_templates")
      .select("*")
      .eq("industry_slug", slug)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { error: "Something went wrong. Please try again." },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: `Industry template with slug "${slug}" not found` },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
