"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { toast } from "sonner";
import { Phone, Search, Loader2, ArrowLeft } from "lucide-react";

type AvailableNumber = {
  phone_number: string;
  friendly_name: string;
  type: "local" | "toll_free" | "mobile";
  monthly_cost_cents: number;
  setup_fee_cents: number;
  capabilities: { voice: boolean; sms: boolean; mms: boolean };
};

function formatPhoneDisplay(num: string): string {
  const d = num.replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("1")) {
    return `(${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`;
  }
  if (d.length === 10) {
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  }
  return num;
}

export default function PhoneMarketplacePage() {
  const [country, setCountry] = useState("US");
  const [state, setState] = useState("");
  const [areaCode, setAreaCode] = useState("");
  const [type, setType] = useState<"local" | "toll_free">("local");
  const [numbers, setNumbers] = useState<AvailableNumber[]>([]);
  const [loading, setLoading] = useState(false);
  const [provisioning, setProvisioning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const search = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ country, type });
      if (areaCode) params.set("areaCode", areaCode);
      if (state) params.set("state", state);
      const res = await fetch(`/api/phone/available?${params.toString()}`, { credentials: "include" });
      const data = (await res.json()) as { numbers?: AvailableNumber[]; message?: string };
      if (!res.ok) {
        setError(data.message ?? "Search failed.");
        setNumbers([]);
        return;
      }
      setNumbers(data.numbers ?? []);
      if ((data.numbers?.length ?? 0) === 0 && data.message) {
        setError(data.message);
      }
    } catch {
      setError("Could not search. Try again.");
      setNumbers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    search();
  }, []);

  const handleProvision = async (num: AvailableNumber) => {
    setProvisioning(num.phone_number);
    try {
      const res = await fetch("/api/phone/provision", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone_number: num.phone_number,
          friendly_name: formatPhoneDisplay(num.phone_number),
          number_type: num.type,
        }),
      });
      const data = (await res.json()) as { error?: string; phone_number?: string };
      if (!res.ok) {
        toast.error(data.error ?? "Provisioning failed.");
        return;
      }
      toast.success("Number added to your workspace.");
      window.location.href = "/app/settings/phone";
    } catch {
      toast.error("Something went wrong. Try again.");
    } finally {
      setProvisioning(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Breadcrumbs
        items={[
          { label: "Settings", href: "/app/settings" },
          { label: "Phone & numbers", href: "/app/settings/phone" },
          { label: "Get a number" },
        ]}
      />
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/app/settings/phone"
          className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
      </div>
      <h1 className="text-xl font-semibold text-white mb-1">Get a new number</h1>
      <p className="text-sm text-zinc-400 mb-6">
        Search available numbers and add one to your workspace. You can assign it to an agent from Phone settings.
      </p>

      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Country</label>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-white text-sm focus:border-[var(--accent-primary)] focus:outline-none"
            >
              <option value="US">United States</option>
              <option value="CA">Canada</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">State / Region</label>
            <input
              type="text"
              value={state}
              onChange={(e) => setState(e.target.value)}
              placeholder="e.g. CA"
              maxLength={2}
              className="w-full px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-white text-sm placeholder:text-zinc-500 focus:border-[var(--accent-primary)] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Area code</label>
            <input
              type="text"
              value={areaCode}
              onChange={(e) => setAreaCode(e.target.value.replace(/\D/g, "").slice(0, 3))}
              placeholder="e.g. 415"
              maxLength={3}
              className="w-full px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-white text-sm placeholder:text-zinc-500 focus:border-[var(--accent-primary)] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as "local" | "toll_free")}
              className="w-full px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-white text-sm focus:border-[var(--accent-primary)] focus:outline-none"
            >
              <option value="local">Local</option>
              <option value="toll_free">Toll-free</option>
            </select>
          </div>
        </div>
        <button
          type="button"
          onClick={search}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-black font-medium text-sm hover:bg-zinc-100 transition-colors disabled:opacity-60"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          Search
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-sm">
          {error}
        </div>
      )}

      <div className="grid gap-3">
        {loading && numbers.length === 0 ? (
          <div className="p-8 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] text-center text-zinc-500 text-sm">
            Searching for numbers…
          </div>
        ) : numbers.length === 0 ? (
          <div className="p-8 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] text-center text-zinc-500 text-sm">
            No numbers found. Try a different area code or type.
          </div>
        ) : (
          numbers.map((n) => (
            <div
              key={n.phone_number}
              className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)]"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--accent-primary)]/10 flex items-center justify-center">
                  <Phone className="w-5 h-5 text-[var(--accent-primary)]" />
                </div>
                <div>
                  <p className="font-semibold text-white font-mono">{formatPhoneDisplay(n.phone_number)}</p>
                  <p className="text-xs text-zinc-500 capitalize">{n.type.replace("_", " ")}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm text-zinc-400">
                <span>${(n.monthly_cost_cents / 100).toFixed(2)}/mo</span>
                {n.capabilities.voice && <span>Voice</span>}
                {n.capabilities.sms && <span>SMS</span>}
              </div>
              <button
                type="button"
                onClick={() => handleProvision(n)}
                disabled={provisioning !== null}
                className="px-4 py-2 rounded-xl bg-white text-black font-medium text-sm hover:bg-zinc-100 transition-colors disabled:opacity-60 flex items-center gap-2"
              >
                {provisioning === n.phone_number ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Adding…
                  </>
                ) : (
                  "Get this number"
                )}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
