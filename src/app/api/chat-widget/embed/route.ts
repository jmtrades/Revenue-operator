export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/chat-widget/embed?workspace_id=xxx
 * Returns the embeddable JavaScript snippet for the chat widget
 * This script creates an iframe pointing to the widget page and loads the chat widget
 */
export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get("workspace_id");

  if (!workspaceId) {
    return NextResponse.json(
      { error: "workspace_id query parameter required" },
      { status: 400 }
    );
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL || "https://app.revenueoperator.ai";
  const widgetUrl = `${origin}/chat-widget?workspace_id=${encodeURIComponent(workspaceId)}`;
  const scriptUrl = `${origin}/chat-widget.js`;

  const embedScript = `(function() {
  // Revenue Operator Chat Widget Embed
  // Add this snippet to your website to enable live chat

  const workspaceId = '${workspaceId}';
  const widgetUrl = '${widgetUrl}';
  const scriptUrl = '${scriptUrl}';

  // Load the chat widget script
  const script = document.createElement('script');
  script.src = scriptUrl;
  script.async = true;
  script.onload = function() {
    if (window.RevenueChatWidget) {
      window.RevenueChatWidget.init({
        workspaceId: workspaceId,
        containerUrl: widgetUrl
      });
    }
  };
  document.head.appendChild(script);
})();`;

  return new NextResponse(embedScript, {
    status: 200,
    headers: {
      "Content-Type": "application/javascript",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
