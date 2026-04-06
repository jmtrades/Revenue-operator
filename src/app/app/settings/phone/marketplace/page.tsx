"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { formatCurrencyCents } from "@/lib/currency";
import { toast } from "sonner";
import { Phone, Search, Loader2, ArrowLeft, AlertCircle, CheckCircle2 } from "lucide-react";
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
  const [type, setType] = useState<"local" | "toll_free" | "mobile">("local");
  const [numbers, setNumbers] = useState<AvailableNumber[]>([]);
  const [loading, setLoading] = useState(false);
  const [provisioning, setProvisioning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<"api" | "empty" | "provision">("api");
  const [lastProvisionAttempt, setLastProvisionAttempt] = useState<AvailableNumber | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingNumber, setPendingNumber] = useState<AvailableNumber | null>(null);
  const [provisionSuccess, setProvisionSuccess] = useState(false);
  const [successNumber, setSuccessNumber] = useState<AvailableNumber | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = async () => {
    setLoading(true);
    setError(null);
    setProvisionSuccess(false);
    setHasSearched(true);
    try {
      const params = new URLSearchParams({ country, type });
      if (areaCode) params.set("areaCode", areaCode);
      if (state) params.set("state", state);
      const res = await fetch(`/api/phone/available?${params.toString()}`, { credentials: "include" });
      const data = (await res.json()) as { numbers?: AvailableNumber[]; message?: string };
      if (!res.ok) {
        setError(data.message ?? tSettings("phone.searchFailed"));
        setErrorType("api");
        setNumbers([]);
        return;
      }
      setNumbers(data.numbers ?? []);
      if ((data.numbers?.length ?? 0) === 0) {
        setError(tPhone("marketplace.noNumbersAvailable"));
        setErrorType("empty");
      }
    } catch {
      setError(tToast("error.generic"));
      setErrorType("api");
      setNumbers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    searchDebounceRef.current = setTimeout(() => {
      search();
    }, 300);
     
  }, [country, type]);

  // Auto-search on page load with default filters
  useEffect(() => {
    search();
     
  }, []);

  const handleProvisionConfirmed = async (num: AvailableNumber) => {
    setProvisioning(num.phone_number);
    setShowConfirmDialog(false);
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
      const data = (await res.json()) as { error?: string; provider_code?: string; phone_number?: string; code?: string; detail?: string };
      if (!res.ok) {
        // If payment method required, redirect to billing to add a card
        if (res.status === 402 || data.provider_code === "PAYMENT_METHOD_REQUIRED" || data.code === "PAYMENT_METHOD_REQUIRED") {
          toast.error(tSettings("phone.paymentRequired"));
          window.location.href = "/app/settings/billing?reason=phone_purchase";
          return;
        }

        if (res.status === 403 || data.code === "SUBSCRIPTION_REQUIRED") {
          toast.error(tSettings("phone.subscriptionRequired"));
          window.location.href = "/app/settings/billing?reason=subscription_required";
          return;
        }

        const errorMsg = data.error ?? tSettings("phone.provisionFailed");
        setError(errorMsg);
        setErrorType("provision");
        setLastProvisionAttempt(num);
        toast.error(errorMsg);
        return;
      }
      setProvisionSuccess(true);
      setSuccessNumber(num);
      toast.success(tSettings("phone.provisioned"));
    } catch {
      setError(tToast("error.generic"));
      setErrorType("provision");
      setLastProvisionAttempt(num);
      toast.error(tToast("error.generic"));
    } finally {
      setProvisioning(null);
    }
  };

  const handleProvision = (num: AvailableNumber) => {
    setPendingNumber(num);
    setShowConfirmDialog(true);
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
      <h1 className="text-xl font-bold tracking-[-0.025em] text-[var(--text-primary)] mb-1">{tPhone("marketplaceGetNewNumber")}</h1>
      <p className="text-[13px] text-[var(--text-tertiary)] mt-1.5 leading-relaxed mb-6">
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
              onChange={(e) => setAreaCode((e.target.value ?? "").replace(/\D/g, "").slice(0, 3))}
              placeholder={tPhone("marketplace.areaCodePlaceholder")}
              maxLength={3}
              className="w-full px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] text-sm placeholder:text-[var(--text-secondary)] focus:border-[var(--accent-primary)] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">{tPhone("marketplaceType")}</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as "local" | "toll_free" | "mobile")}
              className="w-full px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] text-sm focus:border-[var(--accent-primary)] focus:outline-none"
            >
              <option value="local">{tPhone("marketplace.results.type.local")}</option>
              <option value="toll_free">{tPhone("marketplace.results.type.tollFree")}</option>
              <option value="mobile">{tPhone("marketplace.mobile")}</option>
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
        <div className="mb-4 p-4 rounded-xl bg-[var(--accent-warning,#f59e0b)]/10 border border-[var(--accent-warning,#f59e0b)]/20 text-[var(--accent-warning,#f59e0b)] text-sm flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
          <div className="flex items-center gap-2 ml-8">
            {errorType === "provision" && lastProvisionAttempt && (
              <button
                type="button"
                onClick={() => { setError(null); handleProvisionConfirmed(lastProvisionAttempt); }}
                disabled={provisioning !== null}
                className="px-3 py-1.5 rounded-lg bg-[var(--accent-warning,#f59e0b)]/20 hover:bg-[var(--accent-warning,#f59e0b)]/30 text-xs font-medium transition-colors disabled:opacity-50"
              >
                {tPhone("marketplace.tryAgainButton")}
              </button>
            )}
            {errorType === "api" && (
              <button
                type="button"
                onClick={() => { setError(null); search(); }}
                disabled={loading}
                className="px-3 py-1.5 rounded-lg bg-[var(--accent-warning,#f59e0b)]/20 hover:bg-[var(--accent-warning,#f59e0b)]/30 text-xs font-medium transition-colors disabled:opacity-50"
              >
                {tPhone("marketplace.retrySearch")}
              </button>
            )}
            {errorType === "empty" && (
              <button
                type="button"
                onClick={() => { setError(null); }}
                className="px-3 py-1.5 rounded-lg bg-[var(--accent-warning,#f59e0b)]/20 hover:bg-[var(--accent-warning,#f59e0b)]/30 text-xs font-medium transition-colors"
              >
                {tPhone("marketplace.dismiss")}
              </button>
            )}
          </div>
        </div>
      )}

      {provisionSuccess && successNumber ? (
        <div className="p-6 rounded-2xl border border-[var(--accent-primary)]/20 bg-[var(--accent-primary)]/10 flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-6 h-6 text-[var(--accent-primary)] flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-[var(--text-primary)] mb-1">{tPhone("marketplace.numberProvisioned")}</p>
              <p className="font-mono text-lg text-[var(--text-primary)] mb-3">{formatPhoneDisplay(successNumber.phone_number)}</p>
              <p className="text-sm text-[var(--text-secondary)] mb-4">{tPhone("marketplace.nowActive", { number: formatPhoneDisplay(successNumber.phone_number) })}</p>
              <div className="bg-[var(--bg-card)] rounded-lg p-3 mb-4 border border-[var(--border-default)]/50">
                <p className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide mb-2">{tPhone("marketplace.nextSteps")}</p>
                <ul className="space-y-1.5 text-sm text-[var(--text-secondary)]">
                  <li className="flex items-center gap-2">
                    <span className="text-[var(--accent-primary)]">•</span>
                    <button type="button" className="text-[var(--accent-primary)] hover:underline">{tPhone("marketplace.setAsDefault")}</button>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-[var(--accent-primary)]">•</span>
                    <button type="button" className="text-[var(--accent-primary)] hover:underline">{tPhone("marketplace.assignToAgent")}</button>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <Link
            href="/app/settings/phone"
            className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-[var(--accent-primary)] text-[var(--text-on-accent)] font-medium text-sm hover:opacity-90 transition-colors w-fit"
          >
            {tPhone("marketplace.goToPhoneSettings")}
          </Link>
        </div>
      ) : (
        <div className="grid gap-3">
          {numbers.length > 0 && !loading && (
            <div className="flex flex-col gap-2 mb-4">
              <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-default)]/50">
                <p className="text-sm text-[var(--text-secondary)]">
                  {tPhone("marketplace.showingCount", { count: numbers.length })}
                </p>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--accent-primary)]/5 border border-[var(--accent-primary)]/10">
                <span className="text-[var(--accent-primary)] text-xs">✓</span>
                <p className="text-xs text-[var(--text-tertiary)]">{tPhone("marketplace.verifiedNumbers", { defaultValue: "Verified business numbers" })}</p>
              </div>
            </div>
          )}
          {loading && numbers.length === 0 ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="p-4 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] skeleton-shimmer"
                >
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-10 h-10 rounded-xl bg-[var(--bg-input)]" />
                      <div className="space-y-2">
                        <div className="h-4 w-32 bg-[var(--bg-input)] rounded" />
                        <div className="h-3 w-24 bg-[var(--bg-input)] rounded" />
                      </div>
                    </div>
                    <div className="w-24 h-8 bg-[var(--bg-input)] rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          ) : !hasSearched && numbers.length === 0 && !loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="p-4 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] skeleton-shimmer"
                >
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-10 h-10 rounded-xl bg-[var(--bg-input)]" />
                      <div className="space-y-2">
                        <div className="h-4 w-32 bg-[var(--bg-input)] rounded" />
                        <div className="h-3 w-24 bg-[var(--bg-input)] rounded" />
                      </div>
                    </div>
                    <div className="w-24 h-8 bg-[var(--bg-input)] rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          ) : hasSearched && numbers.length === 0 && !error ? (
            <div className="p-8 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] text-center">
              <Phone className="w-12 h-12 mx-auto mb-3 text-[var(--text-tertiary)] opacity-50" />
              <p className="text-[var(--text-secondary)] text-sm mb-2">{tPhone("marketplaceNoNumbersFound")}</p>
              <p className="text-xs text-[var(--text-tertiary)]">{tPhone("marketplace.tryAdjustingFilters")}</p>
            </div>
          ) : (
            numbers.map((n) => (
              <div
                key={n.phone_number}
                className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 hover:border-[var(--accent-primary)]/30 transition-colors"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-center">
                  <div className="lg:col-span-1">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[var(--accent-primary)]/10 flex items-center justify-center flex-shrink-0">
                        <Phone className="w-5 h-5 text-[var(--accent-primary)]" />
                      </div>
                      <div>
                        <p className="font-semibold text-[var(--text-primary)] font-mono text-base">{formatPhoneDisplay(n.phone_number)}</p>
                        <p className="text-xs text-[var(--text-secondary)] capitalize mt-0.5">
                          {n.type === "toll_free" ? tPhone("marketplace.results.type.tollFree") : n.type === "mobile" ? tPhone("marketplace.mobile") : tPhone("marketplace.results.type.local")}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-1">
                    <div className="flex flex-wrap gap-2">
                      {n.capabilities.voice && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[var(--bg-input)] text-xs font-medium text-[var(--text-secondary)]">
                          <Phone className="w-3 h-3" />
                          {tPhone("voice")}
                        </span>
                      )}
                      {n.capabilities.sms && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[var(--bg-input)] text-xs font-medium text-[var(--text-secondary)]">
                          <span>📱</span>
                          {tPhone("sms")}
                        </span>
                      )}
                      {n.capabilities.mms && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[var(--bg-input)] text-xs font-medium text-[var(--text-secondary)]">
                          <span>📸</span>
                          {tPhone("mms")}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="lg:col-span-1">
                    <div className="bg-[var(--bg-input)]/50 rounded-lg p-3 border border-[var(--border-default)]/50">
                      <p className="text-xs text-[var(--text-tertiary)] uppercase tracking-wide mb-1">{tPhone("marketplace.pricing")}</p>
                      <p className="font-semibold text-[var(--text-primary)]">{formatCurrencyCents(n.monthly_cost_cents, "USD", locale)}<span className="text-xs text-[var(--text-secondary)] font-normal">/mo</span></p>
                      <p className="text-xs text-[var(--text-tertiary)] mt-1">{tPhone("marketplace.plusSetupFee", { fee: formatCurrencyCents(n.setup_fee_cents, "USD", locale) })}</p>
                    </div>
                  </div>

                  <div className="lg:col-span-1">
                    <button
                      type="button"
                      onClick={() => handleProvision(n)}
                      disabled={provisioning !== null}
                      className="w-full px-4 py-3 rounded-xl bg-[var(--accent-primary)] text-[var(--text-on-accent)] font-medium text-sm hover:opacity-90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                      {provisioning === n.phone_number ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          {tPhone("marketplaceAdding")}
                        </>
                      ) : (
                        <>
                          <Phone className="w-4 h-4" />
                          {tPhone("marketplace.purchase")}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {showConfirmDialog && pendingNumber && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-default)] p-6 max-w-sm shadow-lg">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">{tPhone("marketplace.confirmPurchase")}</h2>
            <div className="space-y-3 mb-6">
              <div className="p-3 rounded-xl bg-[var(--bg-input)]">
                <p className="text-xs text-[var(--text-secondary)] mb-1">{tPhone("marketplace.phoneNumberLabel")}</p>
                <p className="font-semibold text-[var(--text-primary)] font-mono">{formatPhoneDisplay(pendingNumber.phone_number)}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-[var(--bg-input)]">
                  <p className="text-xs text-[var(--text-secondary)] mb-1">{tPhone("marketplace.monthlyCost")}</p>
                  <p className="font-semibold text-[var(--text-primary)]">{formatCurrencyCents(pendingNumber.monthly_cost_cents, "USD", locale)}</p>
                </div>
                <div className="p-3 rounded-xl bg-[var(--bg-input)]">
                  <p className="text-xs text-[var(--text-secondary)] mb-1">{tPhone("marketplace.setupFee")}</p>
                  <p className="font-semibold text-[var(--text-primary)]">{formatCurrencyCents(pendingNumber.setup_fee_cents, "USD", locale)}</p>
                </div>
              </div>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mb-6">{tPhone("marketplace.chargedImmediately")}</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmDialog(false)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-[var(--bg-input)] text-[var(--text-primary)] font-medium text-sm hover:opacity-80 transition-colors"
              >
                {tPhone("marketplace.cancel")}
              </button>
              <button
                type="button"
                onClick={() => handleProvisionConfirmed(pendingNumber)}
                disabled={provisioning !== null}
                className="flex-1 px-4 py-2.5 rounded-xl bg-[var(--accent-primary)] text-[var(--text-on-accent)] font-medium text-sm hover:opacity-90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {provisioning === pendingNumber.phone_number ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {tPhone("marketplace.processing")}
                  </>
                ) : (
                  tPhone("marketplace.confirmPurchase")
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
