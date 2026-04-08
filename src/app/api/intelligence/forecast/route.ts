import { NextRequest, NextResponse } from "next/server";
import {
  forecastRevenue,
  analyzePipelineHealth,
  identifyAtRiskDeals,
  generateRevenueInsights,
} from "@/lib/intelligence/revenue-forecast-engine";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { assertSameOrigin } from "@/lib/http/csrf";

export async function POST(request: NextRequest) {
  const csrfBlock = assertSameOrigin(request);
  if (csrfBlock) return csrfBlock;

  const session = await getSession(request);
  const workspaceId = session?.workspaceId;
  if (!workspaceId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const authErr = await requireWorkspaceAccess(request, workspaceId);
  if (authErr) return authErr;

  try {
    const body = await request.json();
    const { action, ...params } = body;

    if (!action) {
      return NextResponse.json(
        { error: "Missing required field: action" },
        { status: 400 }
      );
    }

    let result;

    switch (action) {
      case "forecast":
        result = await forecastRevenue(params.pipeline, params.historicalData);
        break;

      case "health":
        result = await analyzePipelineHealth(params.pipeline);
        break;

      case "at-risk":
        result = await identifyAtRiskDeals(params.pipeline);
        break;

      case "insights":
        result = await generateRevenueInsights(params.forecast, params.health);
        break;

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Revenue forecast intelligence failed", details: message },
      { status: 500 }
    );
  }
}
