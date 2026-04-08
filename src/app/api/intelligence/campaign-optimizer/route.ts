import { NextRequest, NextResponse } from "next/server";
import {
  analyzeCampaignPerformance,
  generateOptimizations,
  detectCampaignAnomalies,
  scoreCampaignHealth,
} from "@/lib/intelligence/campaign-optimizer";

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
      case "analyze":
        result = await analyzeCampaignPerformance(params);
        break;

      case "optimize":
        result = await generateOptimizations(params);
        break;

      case "anomalies":
        result = await detectCampaignAnomalies(params);
        break;

      case "health":
        result = await scoreCampaignHealth(params);
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
      { error: "Campaign optimizer intelligence failed", details: message },
      { status: 500 }
    );
  }
}
