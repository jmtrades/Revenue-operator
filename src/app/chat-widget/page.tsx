"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

/**
 * Chat Widget Page
 * This page is embedded in an iframe on customer websites.
 * It handles the chat interface for visitors.
 */
export default function ChatWidgetPage() {
  const searchParams = useSearchParams();
  const workspaceId = searchParams.get("workspace_id");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Verify workspace and load widget configuration
    if (!workspaceId) {
      setError("No workspace ID provided");
      setLoading(false);
      return;
    }

    const verifyWorkspace = async () => {
      try {
        const res = await fetch(
          `/api/chat-widget/config?workspace_id=${encodeURIComponent(workspaceId)}`
        );
        if (!res.ok) {
          setError("Workspace not found");
          return;
        }
        setLoading(false);
      } catch (err) {
        console.error("Failed to verify workspace:", err);
        setError("Failed to load chat widget");
      }
    };

    verifyWorkspace();
  }, [workspaceId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-gray-600">Loading chat widget...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-red-600 text-center">
          <p className="font-medium">{error}</p>
          <p className="text-sm mt-2">Please contact the website administrator</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
        {/* This page serves as a container for iframe-based chat.
            The actual chat widget is rendered by the JavaScript in public/chat-widget.js
            This page validates the workspace exists and is secure.
        */}
        <div className="p-8 text-center">
          <p className="text-gray-600 mb-4">
            Chat widget for workspace: <code className="bg-gray-100 px-2 py-1 rounded text-sm">{workspaceId}</code>
          </p>
          <p className="text-sm text-gray-500">
            If you are seeing this page directly, the chat widget should be embedded on a website.
          </p>
        </div>
      </div>
    </div>
  );
}
