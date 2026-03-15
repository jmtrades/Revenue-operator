"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { OnboardExecutionStateBanner } from "@/components/ExecutionStateBanner";

export default function OnboardIdentityPage() {
  const router = useRouter();
  const [businessName, setBusinessName] = useState("");
  const [operatorName, setOperatorName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim() || !operatorName.trim() || !email.trim()) {
      setError("All fields required");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/onboard/identity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_name: businessName.trim(),
          operator_name: operatorName.trim(),
          email: email.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Failed to create workspace");
        setLoading(false);
        return;
      }
      const workspaceId = json.workspace_id;
      sessionStorage.setItem("onboard_workspace_id", workspaceId);
      router.push("/onboard/domain");
    } catch {
      setError("Network error");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-stone-50 p-6">
      <div className="mx-auto max-w-[720px] pt-16">
        <div className="space-y-8">
          <OnboardExecutionStateBanner />
          <div className="space-y-6">
            <div>
              <label htmlFor="business_name" className="block text-[13px] font-medium uppercase tracking-wide text-stone-500 mb-2">
                Business name
              </label>
              <input
                id="business_name"
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full px-4 py-2 text-[18px] text-stone-900 bg-white border border-stone-200 focus:outline-none focus:border-stone-700"
                disabled={loading}
              />
            </div>
            <div>
              <label htmlFor="operator_name" className="block text-[13px] font-medium uppercase tracking-wide text-stone-500 mb-2">
                Your name
              </label>
              <input
                id="operator_name"
                type="text"
                value={operatorName}
                onChange={(e) => setOperatorName(e.target.value)}
                className="w-full px-4 py-2 text-[18px] text-stone-900 bg-white border border-stone-200 focus:outline-none focus:border-stone-700"
                disabled={loading}
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-[13px] font-medium uppercase tracking-wide text-stone-500 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 text-[18px] text-stone-900 bg-white border border-stone-200 focus:outline-none focus:border-stone-700"
                disabled={loading}
              />
            </div>
            {error && <p className="text-[18px] text-stone-500">{error}</p>}
          </div>
          <div className="border-t border-stone-200 pt-8">
            <form onSubmit={handleSubmit}>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-6 text-[18px] font-medium text-stone-900 bg-stone-200 hover:bg-stone-300 disabled:opacity-50 transition-colors"
              >
                {loading ? "Creating..." : "Continue"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
