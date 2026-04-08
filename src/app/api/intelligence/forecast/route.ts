import { NextRequest, NextResponse } from "next/server";
import {
  forecastRevenue,
  analyzePipelineHealth,
  identifyAtRiskDeals,
  generateRevenueInsights,
} from "@/lib/intelligence/revenue-forecast-engine";

export async function POST(request: NextRequest) {
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
        result = await forecastRevenue(params);
        break;

      case "health":
        result = await analyzePipelineHealth(params);
        break;

      case "at-risk":
        result = await identifyAtRiskDeals(params);
        break;

      case "insights":
        result = await generateRevenueInsights(params);
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
