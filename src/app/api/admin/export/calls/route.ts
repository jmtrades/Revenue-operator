/**
 * Admin export route for call_sessions
 * GET route requiring admin authentication
 * Returns CSV with id, workspace_id, started_at, ended_at, status
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { isAdmin, forbidden } from "@/lib/admin/auth";
import { getDb } from "@/lib/db/queries";

function convertToCSV(data: any[]): string {
  if (data.length === 0) {
    return "id,workspace_id,started_at,ended_at,status\n";
  }

  const headers = ["id", "workspace_id", "started_at", "ended_at", "status"];
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

    // Query call_sessions table
    const { data: callSessions, error } = await db
      .from("call_sessions")
      .select("id, workspace_id, started_at, ended_at, status")
      .order("started_at", { ascending: false });

    if (error) {
      throw error;
    }

    const csvContent = convertToCSV(callSessions || []);

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="calls-export.csv"',
      },
    });
  } catch (error) {
    console.error("[API] admin export calls error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
