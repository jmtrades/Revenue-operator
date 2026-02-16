"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export default function OnboardSendPage() {
  const router = useRouter();
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [externalRef, setExternalRef] = useState<string | null>(null);
  const [counterpartyContact, setCounterpartyContact] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHesitationFallback, setShowHesitationFallback] = useState(false);

  useEffect(() => {
    const wsId = sessionStorage.getItem("onboard_workspace_id");
    const extRef = sessionStorage.getItem("onboard_external_ref");
    if (!wsId || !extRef) {
      router.push("/onboard/identity");
      return;
    }
    setWorkspaceId(wsId);
    setExternalRef(extRef);
  }, [router]);

  useEffect(() => {
    if (!counterpartyContact.trim()) return;
    const timer = setTimeout(() => {
      setShowHesitationFallback(true);
    }, 20000);
    return () => clearTimeout(timer);
  }, [counterpartyContact]);

  const handleSend = async () => {
    if (!counterpartyContact.trim()) {
      setError("Contact required");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/onboard/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace_id: workspaceId,
          external_ref: externalRef,
          counterparty_contact: counterpartyContact.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Failed to send");
        setLoading(false);
        return;
      }
      router.push("/onboard/waiting");
    } catch {
      setError("Network error");
      setLoading(false);
    }
  };

  if (!workspaceId || !externalRef) return null;

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#fafaf9] p-6">
      <div className="max-w-md w-full space-y-6">
        <p className="text-[18px] leading-relaxed text-[#1c1917]">
          Send this record to someone who can confirm it.
        </p>
        <div>
          <label htmlFor="contact" className="block text-[13px] font-medium uppercase tracking-wide text-[#78716c] mb-2">
            Contact (email or phone)
          </label>
          <input
            id="contact"
            type="text"
            value={counterpartyContact}
            onChange={(e) => {
              setCounterpartyContact(e.target.value);
              setShowHesitationFallback(false);
            }}
            className="w-full px-4 py-2 text-[18px] text-[#1c1917] bg-white border border-[#e7e5e4] focus:outline-none focus:border-[#44403c]"
            disabled={loading}
            placeholder="email@example.com or +1234567890"
          />
        </div>
        {showHesitationFallback && (
          <p className="text-[18px] leading-relaxed text-[#78716c]">
            A record can be sent now or shared later.
          </p>
        )}
        {error && <p className="text-[18px] text-[#78716c]">{error}</p>}
        <button
          type="button"
          onClick={handleSend}
          disabled={loading}
          className="w-full py-3 px-6 text-[18px] font-medium text-[#1c1917] bg-[#e7e5e4] hover:bg-[#d6d3d1] disabled:opacity-50 transition-colors"
        >
          {loading ? "Sending..." : "Send record"}
        </button>
      </div>
    </main>
  );
}
