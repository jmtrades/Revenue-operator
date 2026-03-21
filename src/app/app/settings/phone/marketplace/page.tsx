"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { formatCurrencyCents } from "@/lib/currency";
import { toast } from "sonner";
import { Phone, Search, Loader2, ArrowLeft } from "lucide-react";
import { SUPPORTED_PHONE_COUNTRIES } from "@/lib/constants";

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
  const locale = useLocale() || "en-US";
  const tSettings = useTranslations("settings");
  const tToast = useTranslations("toast");
  const tPhone = useTranslations("phone");
  const [country, setCountry] = useState("US");

  const countryNames = useMemo(() => {
    try {
      const dn = new Intl.DisplayNames([locale], { type: "region" });
      return Object.fromEntries(SUPPORTED_PHONE_COUNTRIES.map((c) => [c, dn.of(c) ?? c]));
    } catch {
      return Object.fromEntries(SUPPORTED_PHONE_COUNTRIES.map((c) => [c, c]));
    }
  }, [locale]);
  const [state, setState] = useState("");
  const [areaCode, setAreaCode] = useState("");
  const [type, setType] = useState<"local" | "toll_free">("local");
  const [numbers, setNumbers] = useState<AvailableNumber[]>([]);
  const [loading, setLoading] = useState(false);
  const [provisioning, setProvisioning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastProvisionAttempt, setLastProvisionAttempt] = useState<AvailableNumber | null>(null);

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
        setError(data.message ?? tSettings("phone.searchFailed"));
        setNumbers([]);
        return;
      }
      setNumbers(data.numbers ?? []);
      if ((data.numbers?.length ?? 0) === 0 && data.message) {
        setError(data.message);
      }
    } catch {
      setError(tToast("error.generic"));
      setNumbers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    search();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-search when country or type changes
  }, [country, type]);

  const handleProvision = async (num: AvailableNumber) => {
    const costPerMonth = formatCurrencyCents(num.monthly_cost_cents, "USD", locale);
    const confirmed = window.confirm(
      `Purchase this number for ${costPerMonth}/month? This will be charged to your account immediately.`
    );
    if (!confirmed) return;

    setProvisioning(num.phone_number);
    setLastProvisionAttempt(num);
    try {
      const res = await fetch("/api/phone/provision", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone_number: num.phone_number,
          friendly_name: formatPhoneDisplay(num.phone_number),
          number_type: num.type,
          country,
        }),
      });
      const data = (await res.json()) as { error?: string; provider_code?: string; phone_number?: string };
      if (!res.ok) {
        const msg = data.error ?? tSettings("phone.provisionFailed");
        setError(msg);
        toast.error(msg);
        return;
      }
      toast.success(tSettings("phone.provisioned"));
      window.location.href = "/app/settings/phone";
    } catch {
      toast.error(tToast("error.generic"));
    } finally {
      setProvisioning(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Breadcrumbs
        items={[
          { label: tSettings("integrations.breadcrumbSettings"), href: "/app/settings" },
          { label: tSettings("phone.title"), href: "/app/settings/phone" },
          { label: tPhone("marketplaceBreadcrumb") },
        ]}
      />
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/app/settings/phone"
          className="flex items-center gap-2 text-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {tPhone("marketplaceBack")}
        </Link>
      </div>
      <h1 className="text-xl font-semibold text-[var(--text-primary)] mb-1">{tPhone("marketplaceGetNewNumber")}</h1>
      <p className="text-sm text-[var(--text-tertiary)] mb-6">
        {tPhone("marketplaceGetNewNumberDesc")}
      </p>

      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">{tPhone("marketplaceCountry")}</label>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] text-sm focus:border-[var(--accent-primary)] focus:outline-none"
            >
              {SUPPORTED_PHONE_COUNTRIES.map((code) => (
                <option key={code} value={code}>{countryNames[code]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">{tPhone("marketplace.search.region")}</label>
            <input
              type="text"
              value={state}
              onChange={(e) => setState(e.target.value)}
              placeholder={tPhone("marketplace.statePlaceholder")}
              maxLength={2}
              className="w-full px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] text-sm placeholder:text-[var(--text-secondary)] focus:border-[var(--accent-primary)] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">{tPhone("marketplaceAreaCode")}</label>
            <input
              type="text"
              value={areaCode}
              onChange={(e) => setAreaCode(e.target.value.replace(/\D/g, "").slice(0, 3))}
              placeholder={tPhone("marketplace.areaCodePlaceholder")}
              maxLength={3}
              className="w-full px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] text-sm placeholder:text-[var(--text-secondary)] focus:border-[var(--accent-primary)] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">{tPhone("marketplaceType")}</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as "local" | "toll_free")}
              className="w-full px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] text-sm focus:border-[var(--accent-primary)] focus:outline-none"
            >
              <option value="local">{tPhone("marketplace.results.type.local")}</option>
              <option value="toll_free">{tPhone("marketplace.results.type.tollFree")}</option>
            </select>
          </div>
        </div>
        <button
          type="button"
          onClick={search}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--accent-primary)] text-[var(--text-on-accent)] font-medium text-sm hover:opacity-90 transition-colors disabled:opacity-60"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          {tPhone("marketplaceSearch")}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-sm flex flex-wrap items-center justify-between gap-2">
          <span>{error}</span>
          <div className="flex items-center gap-3">
            {lastProvisionAttempt && (
              <button
                type="button"
                onClick={() => { setError(null); void handleProvision(lastProvisionAttempt); }}
                disabled={provisioning !== null}
                className="text-xs font-medium underline underline-offset-2 hover:no-underline disabled:opacity-50"
              >
                {tPhone("tryAgain")}
              </button>
            )}
            <button
              type="button"
              onClick={() => { setError(null); search(); }}
              disabled={loading}
              className="text-xs font-medium underline underline-offset-2 hover:no-underline disabled:opacity-50"
            >
              {tPhone("marketplaceSearch")}
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-3">
        {loading && numbers.length === 0 ? (
          <div className="p-8 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] text-center text-[var(--text-secondary)] text-sm">
            {tPhone("marketplaceSearching")}
          </div>
        ) : numbers.length === 0 ? (
          <div className="p-8 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] text-center text-[var(--text-secondary)] text-sm">
            {tPhone("marketplaceNoNumbersFound")}
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
                  <p className="font-semibold text-[var(--text-primary)] font-mono">{formatPhoneDisplay(n.phone_number)}</p>
                  <p className="text-xs text-[var(--text-secondary)] capitalize">{n.type === "toll_free" ? tPhone("marketplace.results.type.tollFree") : tPhone("marketplace.results.type.local")}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm text-[var(--text-tertiary)]">
                <span>{formatCurrencyCents(n.monthly_cost_cents, "USD", locale)}{tPhone("perMonth")}</span>
                {n.capabilities.voice && <span>{tPhone("voice")}</span>}
                {n.capabilities.sms && <span>{tPhone("sms")}</span>}
              </div>
              <button
                type="button"
                onClick={() => handleProvision(n)}
                disabled={provisioning !== null}
                className="px-4 py-2 rounded-xl bg-[var(--accent-primary)] text-[var(--text-on-accent)] font-medium text-sm hover:opacity-90 transition-colors disabled:opacity-60 flex items-center gap-2"
              >
                {provisioning === n.phone_number ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {tPhone("marketplaceAdding")}
                  </>
                ) : (
                  tPhone("marketplaceGetThisNumber")
                )}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
