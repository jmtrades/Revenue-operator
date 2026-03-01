"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useWorkspace } from "@/components/WorkspaceContext";
import { WorkspaceGate } from "@/components/WorkspaceGate";
import Link from "next/link";

function ConnectPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { workspaceId: contextWid, workspaces, loadWorkspaces } = useWorkspace();
  const urlWid = searchParams.get("workspace_id");
  const workspaceId = contextWid || urlWid || (workspaces.length > 0 ? workspaces[0]?.id : null);
  const [activating, setActivating] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [provisioned, setProvisioned] = useState(false);
  const [testing, setTesting] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [copySuccess, setCopySuccess] = useState(false);
  const [showFallback, setShowFallback] = useState(false);
  const [showCopyConfirmation, setShowCopyConfirmation] = useState(false);
  const isProduction = typeof window !== "undefined" && window.location.hostname !== "localhost";

  useEffect(() => {
    loadWorkspaces();
  }, [loadWorkspaces]);

  useEffect(() => {
    if (!workspaceId && workspaces.length === 0) {
      router.replace("/activate");
    }
  }, [workspaceId, workspaces.length, router]);

  // Auto-provision on mount with retry logic and timeout
  useEffect(() => {
    if (!workspaceId || provisioned) return;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15_000);

    const provision = async () => {
      setActivating(true);
      try {
        const res = await fetch("/api/integrations/twilio/auto-provision", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workspace_id: workspaceId }),
          signal: controller.signal,
        });
        const data = await res.json();

        if (data.success && data.phone_number) {
          setPhoneNumber(data.phone_number);
          setProvisioned(true);
          setRetryCount(0);
          clearTimeout(timeoutId);
          await fetch(`/api/activation?workspace_id=${encodeURIComponent(workspaceId)}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "activate" }),
          });
        } else if (retryCount < 10) {
          setTimeout(() => setRetryCount((c) => c + 1), 3000);
        }
      } catch (error) {
        if (retryCount < 10) {
          setTimeout(() => setRetryCount((c) => c + 1), 3000);
        }
      } finally {
        clearTimeout(timeoutId);
        setActivating(false);
      }
    };

    provision();
    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [workspaceId, provisioned, retryCount]);

  // Show fallback after 45 seconds if no message
  useEffect(() => {
    if (!workspaceId || !provisioned || showFallback) return;
    
    const timer = setTimeout(() => {
      setShowFallback(true);
    }, 45000);
    
    return () => clearTimeout(timer);
  }, [workspaceId, provisioned, showFallback]);

  // Check if already connected and poll for real messages
  useEffect(() => {
    if (!workspaceId || !provisioned) return;

    const checkForMessages = async () => {
      try {
        const res = await fetch(`/api/command-center?workspace_id=${encodeURIComponent(workspaceId)}`);
        const data = await res.json();
        
        // If we have real conversations, redirect to live page with conversation_id
        if (data.recent_conversations && Array.isArray(data.recent_conversations) && data.recent_conversations.length > 0) {
          const latest = data.recent_conversations[0];
          const convId = latest?.id;
          const params = new URLSearchParams({ workspace_id: workspaceId });
          if (convId) params.set("conversation_id", convId);
          router.push(`/live?${params.toString()}`);
        }
      } catch (error) {
        console.error("[connect] Failed to check for messages", error);
      }
    };

    // Poll every 2 seconds for real messages
    const interval = setInterval(checkForMessages, 2000);
    return () => clearInterval(interval);
  }, [workspaceId, provisioned, router]);

  const handleTestMessage = async () => {
    if (!workspaceId || testing) return;
    
    if (isProduction) {
      // In production, guide user to text the number
      alert(`Text "${phoneNumber}" from the number used for this workspace with: "Hi, I'm interested"\n\nThen return here to see it handled.`);
      return;
    }

    setTesting(true);

    try {
      const res = await fetch("/api/dev/simulate-inbound", {
        method: "POST",
      });
      const data = await res.json();

      if (data.success) {
        router.push(`/live?workspace_id=${encodeURIComponent(workspaceId)}`);
      }
    } catch (error) {
      console.error("[connect]", error);
      setTesting(false);
    }
  };

  const handleCopyNumber = async () => {
    if (!phoneNumber) return;
    try {
      await navigator.clipboard.writeText(phoneNumber);
      setCopySuccess(true);
      setShowCopyConfirmation(true);
      setTimeout(() => {
        setCopySuccess(false);
        setShowCopyConfirmation(false);
      }, 3000);
      
      // Log activation event
      if (workspaceId) {
        try {
          await fetch("/api/activation-events", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ step: "connected_number", workspace_id: workspaceId }),
          });
        } catch {
          // Non-blocking
        }
      }
    } catch (error) {
      console.error("[connect] Copy failed", error);
    }
  };
  
  const handleGoToDashboard = () => {
    router.push(workspaceId ? `/dashboard?workspace_id=${encodeURIComponent(workspaceId)}` : "/dashboard");
  };

  if (!workspaceId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8" style={{ background: "var(--background)", color: "var(--text-primary)" }}>
        <p style={{ color: "var(--text-muted)" }}>Preparing…</p>
      </div>
    );
  }

  if (activating && retryCount === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8" style={{ background: "var(--background)", color: "var(--text-primary)" }}>
        <div className="text-center">
          <span className="inline-block w-3 h-3 rounded-full animate-pulse mb-3" style={{ background: "var(--meaning-green)" }} aria-hidden />
          <p style={{ color: "var(--text-muted)" }}>Setting up your number…</p>
        </div>
      </div>
    );
  }

  if (!provisioned || !phoneNumber) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8" style={{ background: "var(--background)", color: "var(--text-primary)" }}>
        <div className="text-center max-w-md">
          {retryCount > 0 && retryCount < 10 ? (
            <>
              <span className="inline-block w-3 h-3 rounded-full animate-pulse mb-3" style={{ background: "var(--meaning-amber)" }} aria-hidden />
              <p className="mb-2" style={{ color: "var(--text-primary)" }}>Setting up your number</p>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>This usually takes a few seconds</p>
            </>
          ) : retryCount >= 10 ? (
            <>
              <span className="inline-block w-3 h-3 rounded-full mb-3" style={{ background: "var(--meaning-red)" }} aria-hidden />
              <p className="mb-2" style={{ color: "var(--text-primary)" }}>Having trouble connecting</p>
              <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>We&apos;re still trying in the background</p>
              <button
                onClick={() => {
                  setRetryCount(0);
                  setProvisioned(false);
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{ background: "var(--surface)", borderColor: "var(--border)", borderWidth: "1px", color: "var(--text-primary)" }}
              >
                Try again
              </button>
            </>
          ) : (
            <>
              <span className="inline-block w-3 h-3 rounded-full animate-pulse mb-3" style={{ background: "var(--meaning-green)" }} aria-hidden />
              <p className="mb-2" style={{ color: "var(--text-primary)" }}>Setting up your number</p>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>This usually takes a few seconds</p>
            </>
          )}
        </div>
      </div>
    );
  }

  // Format phone number for display
  const formatPhoneNumber = (num: string) => {
    const cleaned = num.replace(/\D/g, "");
    if (cleaned.length === 11 && cleaned.startsWith("1")) {
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }
    return num;
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 md:p-12" style={{ background: "var(--background)", color: "var(--text-primary)" }}>
      <div className="max-w-md w-full">
        {/* SECTION A — Your new lead number */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold mb-6" style={{ color: "var(--text-primary)" }}>
            Text this number to see it working
          </h1>
          <div className="p-6 rounded-xl mb-6" style={{ background: "var(--card)", borderColor: "var(--border)", borderWidth: "1px" }}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-3xl font-mono font-semibold" style={{ color: "var(--text-primary)" }}>
                {formatPhoneNumber(phoneNumber)}
              </p>
              <button
                onClick={handleCopyNumber}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-80"
                style={{ background: "var(--surface)", borderColor: "var(--border)", borderWidth: "1px", color: "var(--text-primary)" }}
              >
                {copySuccess ? "Copied" : "Copy"}
              </button>
            </div>
            <div className="p-4 rounded-lg mb-4" style={{ background: "var(--surface)", borderColor: "var(--border)", borderWidth: "1px" }}>
              <p className="text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>
                Text this number:
              </p>
              <p className="text-base p-2 rounded text-center" style={{ background: "var(--background)", color: "var(--text-primary)", fontStyle: "italic" }}>
                Hi — interested, can you tell me more?
              </p>
            </div>
            {!showFallback ? (
              <p className="text-sm text-center" style={{ color: "var(--text-muted)" }}>
                Waiting for your first message…
              </p>
            ) : (
              <div className="mt-4 p-4 rounded-lg" style={{ background: "var(--surface)", borderColor: "var(--border)", borderWidth: "1px" }}>
                <p className="text-sm mb-3" style={{ color: "var(--text-primary)" }}>
                  Don&apos;t have a lead right now?
                </p>
                <p className="text-xs mb-4" style={{ color: "var(--text-secondary)" }}>
                  Add this number to your website, ad, or bio — follow-through continues so they reach your calendar.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleCopyNumber}
                    className="flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-opacity hover:opacity-80"
                    style={{ background: "var(--meaning-green)", color: "#0c0f13" }}
                  >
                    Copy number
                  </button>
                  <button
                    onClick={handleGoToDashboard}
                    className="flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-opacity hover:opacity-80"
                    style={{ background: "var(--surface)", borderColor: "var(--border)", borderWidth: "1px", color: "var(--text-primary)" }}
                  >
                    I&apos;ll test later
                  </button>
                </div>
                <p className="text-center mt-3">
                  <Link
                    href={workspaceId ? `/dashboard/onboarding?workspace_id=${encodeURIComponent(workspaceId)}` : "/dashboard/onboarding"}
                    className="text-sm"
                    style={{ color: "var(--accent-primary)" }}
                  >
                    Complete AI setup (5 steps) →
                  </Link>
                </p>
              </div>
            )}
            
            {showCopyConfirmation && (
              <div className="mt-3 p-3 rounded-lg text-xs text-center" style={{ background: "var(--surface)", borderColor: "var(--border)", borderWidth: "1px" }}>
                <p style={{ color: "var(--text-secondary)" }}>
                  Decision completion continues here so they complete actions and show up.
                </p>
              </div>
            )}
          </div>
          
          {!isProduction && !showFallback && (
            <button
              onClick={handleTestMessage}
              disabled={testing}
              className="w-full py-3 px-4 rounded-lg font-medium transition-opacity disabled:opacity-50"
              style={{ background: "var(--meaning-green)", color: "#0c0f13" }}
            >
              {testing ? "Testing…" : "Test it now"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ConnectPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center p-8" style={{ background: "var(--background)", color: "var(--text-primary)" }}>
        <p style={{ color: "var(--text-muted)" }}>Loading…</p>
      </div>
    }>
      <WorkspaceGate>
        <ConnectPageContent />
      </WorkspaceGate>
    </Suspense>
  );
}
