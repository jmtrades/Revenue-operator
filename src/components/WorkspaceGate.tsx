"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useWorkspace } from "./WorkspaceContext";
import { getSessionSafe } from "@/lib/safe-session";

interface WorkspaceGateProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function WorkspaceGate({ children, fallback }: WorkspaceGateProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { workspaceId, workspaces, loading, retry } = useWorkspace();
  const urlWid = searchParams.get("workspace_id");
  const [sessionStatus, setSessionStatus] = useState<"loading" | "ready" | "missing" | "error">("loading");
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 10; // 20 seconds total (2s * 10)

  // Check session status
  useEffect(() => {
    getSessionSafe().then((result) => {
      setSessionStatus(result.status);
    });
  }, []);

  // Retry logic for missing workspace
  useEffect(() => {
    if (loading || workspaces.length > 0 || retryCount >= maxRetries) return;

    const timer = setTimeout(() => {
      setRetryCount((c) => c + 1);
      retry();
    }, 2000);

    return () => clearTimeout(timer);
  }, [loading, workspaces.length, retryCount, retry]);

  // If we have workspace_id in URL, allow access
  if (urlWid) {
    return <>{children}</>;
  }

  // If loading, show loading state
  if (loading || sessionStatus === "loading") {
    return (
      fallback || (
        <div className="min-h-screen flex flex-col items-center justify-center p-8" style={{ background: "var(--background)", color: "var(--text-primary)" }}>
          <span className="inline-block w-3 h-3 rounded-full animate-pulse mb-3" style={{ background: "var(--meaning-green)" }} aria-hidden />
          <p className="text-sm mb-2" style={{ color: "var(--text-primary)" }}>Restoring your workspace</p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>This takes a moment on first sign-in</p>
        </div>
      )
    );
  }

  // If no workspaces after retries, show recovery options
  if (workspaces.length === 0 && retryCount >= maxRetries) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8" style={{ background: "var(--background)", color: "var(--text-primary)" }}>
        <div className="max-w-md w-full text-center">
          <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
            We couldn't restore your workspace yet
          </h2>
          <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
            This usually resolves quickly. If it persists, restart activation.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => {
                setRetryCount(0);
                retry();
              }}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-80"
              style={{ background: "var(--meaning-green)", color: "#0c0f13" }}
            >
              Retry
            </button>
            <button
              onClick={() => router.push("/activate")}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-80"
              style={{ background: "var(--surface)", borderColor: "var(--border)", borderWidth: "1px", color: "var(--text-primary)" }}
            >
              Restart activation
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If we have workspace, render children
  if (workspaceId || workspaces.length > 0) {
    return <>{children}</>;
  }

  // Fallback to loading
  return (
    fallback || (
      <div className="min-h-screen flex flex-col items-center justify-center p-8" style={{ background: "var(--background)", color: "var(--text-primary)" }}>
        <span className="inline-block w-3 h-3 rounded-full animate-pulse mb-3" style={{ background: "var(--meaning-green)" }} aria-hidden />
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Restoring your workspace…</p>
      </div>
    )
  );
}
