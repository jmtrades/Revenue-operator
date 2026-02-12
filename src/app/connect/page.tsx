"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useWorkspace } from "@/components/WorkspaceContext";
import Link from "next/link";

function ConnectPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { workspaceId: contextWid, workspaces, loadWorkspaces } = useWorkspace();
  const urlWid = searchParams.get("workspace_id");
  const workspaceId = contextWid || urlWid || workspaces[0]?.id;
  const [activating, setActivating] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [provisioned, setProvisioned] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    loadWorkspaces();
  }, [loadWorkspaces]);

  useEffect(() => {
    if (!workspaceId && workspaces.length === 0) {
      router.replace("/activate");
    }
  }, [workspaceId, workspaces.length, router]);

  // Auto-provision on mount
  useEffect(() => {
    if (!workspaceId || provisioned) return;

    const provision = async () => {
      setActivating(true);
      try {
        const res = await fetch("/api/integrations/twilio/auto-provision", {
          method: "POST",
        });
        const data = await res.json();

        if (data.success && data.phone_number) {
          setPhoneNumber(data.phone_number);
          setProvisioned(true);
          // Activate workspace
          await fetch(`/api/activation?workspace_id=${encodeURIComponent(workspaceId)}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "activate" }),
          });
        }
      } catch (error) {
        console.error("[connect]", error);
      } finally {
        setActivating(false);
      }
    };

    provision();
  }, [workspaceId, provisioned]);

  const handleTestMessage = async () => {
    if (!workspaceId || testing) return;
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

  if (!workspaceId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8" style={{ background: "var(--background)", color: "var(--text-primary)" }}>
        <p style={{ color: "var(--text-muted)" }}>Preparing…</p>
      </div>
    );
  }

  if (activating) {
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
        <p style={{ color: "var(--text-muted)" }}>Preparing…</p>
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
          <h1 className="text-2xl font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
            Your conversation number
          </h1>
          <div className="p-6 rounded-xl mb-4" style={{ background: "var(--card)", borderColor: "var(--border)", borderWidth: "1px" }}>
            <p className="text-2xl font-mono font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
              {formatPhoneNumber(phoneNumber)}
            </p>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Use this number for leads. When someone messages it, we handle the conversation automatically.
            </p>
          </div>
        </div>

        {/* SECTION B — Do this now */}
        <div className="space-y-4">
          <div className="p-5 rounded-xl" style={{ background: "var(--card)", borderColor: "var(--border)", borderWidth: "1px" }}>
            <h2 className="text-sm font-medium mb-3" style={{ color: "var(--text-primary)" }}>
              Do this now
            </h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm mb-3" style={{ color: "var(--text-secondary)" }}>
                  Option 1: Text this number from your phone
                </p>
                <button
                  onClick={handleTestMessage}
                  disabled={testing}
                  className="w-full py-3 px-4 rounded-lg font-medium transition-opacity disabled:opacity-50"
                  style={{ background: "var(--meaning-green)", color: "#0c0f13" }}
                >
                  {testing ? "Testing…" : "I've sent a message"}
                </button>
              </div>
              <div className="pt-3" style={{ borderTop: "1px solid var(--border)" }}>
                <p className="text-sm mb-2" style={{ color: "var(--text-secondary)" }}>
                  Option 2: Change your website/ad contact to this number
                </p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Update your contact forms, ads, and website to use this number.
                </p>
              </div>
            </div>
          </div>
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
      <ConnectPageContent />
    </Suspense>
  );
}
