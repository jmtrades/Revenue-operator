"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function OnboardWaitingPage() {
  const router = useRouter();
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [externalRef, setExternalRef] = useState<string | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [stateSignals, setStateSignals] = useState<string[]>([]);

  useEffect(() => {
    const wsId = sessionStorage.getItem("onboard_workspace_id");
    const extRef = sessionStorage.getItem("onboard_external_ref");
    if (!wsId || !extRef) {
      router.push("/onboard/identity");
      return;
    }
    setWorkspaceId(wsId);
    setExternalRef(extRef);

    const checkAcknowledged = async () => {
      try {
        const res = await fetch(`/api/onboard/check-ack?workspace_id=${wsId}&external_ref=${extRef}`);
        const json = await res.json();
        if (json.acknowledged) {
          setAcknowledged(true);
          setTimeout(() => {
            router.push("/onboard/complete");
          }, 2000);
        }
      } catch {
        // ignore
      }
    };

    const fetchStateSignals = async () => {
      try {
        const res = await fetch(`/api/onboard/state-signals?workspace_id=${wsId}&external_ref=${extRef}`);
        const json = await res.json();
        if (Array.isArray(json.signals)) {
          setStateSignals(json.signals);
        }
      } catch {
        // ignore
      }
    };

    checkAcknowledged();
    fetchStateSignals();
    const interval = setInterval(() => {
      checkAcknowledged();
      fetchStateSignals();
    }, 2000);
    return () => clearInterval(interval);
  }, [router]);

  if (!workspaceId || !externalRef) return null;

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#fafaf9] p-6">
      <div className="max-w-md w-full space-y-6 text-center">
        {acknowledged ? (
          <>
            <p className="text-[18px] leading-relaxed text-[#44403c]">
              Another party confirmed the outcome.
            </p>
            <p className="text-[18px] leading-relaxed text-[#44403c]">
              The record is now complete.
            </p>
          </>
        ) : (
          <>
            <p className="text-[18px] leading-relaxed text-[#1c1917]">
              The other side has the record.
            </p>
            <p className="text-[18px] leading-relaxed text-[#44403c]">
              Completion happens when they see the same thing.
            </p>
            {stateSignals.map((signal, i) => (
              <p key={i} className="text-[18px] leading-relaxed text-[#78716c]">
                {signal}
              </p>
            ))}
          </>
        )}
      </div>
    </main>
  );
}
