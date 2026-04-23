/**
 * Admin export route for workspaces/businesses
 * GET route requiring admin authentication
 * Returns CSV with id, name, billing_tier, created_at
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { isAdmin, forbidden } from "@/lib/admin/auth";
import { getDb } from "@/lib/db/queries";
import { log } from "@/lib/logger";

function convertToCSV(data: Record<string, unknown>[]): string {
  if (data.length === 0) {
    return "id,name,billing_tier,created_at\n";
  }

  const headers = ["id", "name", "billing_tier", "created_at"];
  const rows = data.map((row) =>
    headers
      .map((header) => {
        const value = row[header];
        // Escape quotes and wrap in quotes if contains comma or quotes
        if (value === null || value === undefined) {
          return "";
        }
        const stringValue = String(value);
        if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      })
      .join(",")
  );

  return [headers.join(","), ...rows].join("\n");
}

export async function GET(req: NextRequest) {
  try {
    // Check admin authentication
    if (!(await isAdmin(req))) {
      return forbidden();
    }

    const db = getDb();

    // Query workspaces table
    const { data: workspaces, error } = await db
      .from("workspaces")
      .select("id, name, billing_tier, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    const csvContent = convertToCSV(workspaces || []);

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="businesses-export.csv"',
      },
    });
  } catch (error) {
    log("error", "[API] admin export businesses error:", { error: error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
