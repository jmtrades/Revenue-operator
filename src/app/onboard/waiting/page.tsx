"use client";

import { useState, useEffect } from "react";
import { OnboardExecutionStateBanner } from "@/components/ExecutionStateBanner";
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
    const id = setTimeout(() => {
      setWorkspaceId(wsId);
      setExternalRef(extRef);
    }, 0);
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
    return () => {
      clearTimeout(id);
      clearInterval(interval);
    };
  }, [router]);

  if (!workspaceId || !externalRef) return null;

  return (
    <main className="min-h-screen bg-[#fafaf9] p-6">
      <div className="mx-auto max-w-[720px] pt-16">
        <div className="space-y-6">
          <OnboardExecutionStateBanner />
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
              {stateSignals.length > 0 && (
                <div className="border-t border-[#e7e5e4] pt-4 space-y-2">
                  {stateSignals.map((signal, i) => (
                    <p key={i} className="text-[18px] leading-relaxed text-[#78716c]">
                      {signal}
                    </p>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
