"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Phone, PhoneCall } from "lucide-react";

export function DemoVoiceButton() {
  const t = useTranslations("demoVoice");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCall = async () => {
    const value = phone.trim();
    const digits = value.replace(/\D/g, "");
    if (!value || digits.length < 7 || digits.length > 15) {
      setError(t("enterPhone"));
      return;
    }
    setLoading(true);
    setStatus(null);
    setError(null);
    try {
      const res = await fetch("/api/demo/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone_number: value }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
        error?: string;
      };
      if (res.ok && data.ok) {
        setStatus(data.message ?? t("callingNow"));
      } else {
        setError(data.error ?? t("couldNotStart"));
      }
    } catch {
      setError(t("couldNotStart"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2 w-full max-w-sm">
      <div className="w-full flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <PhoneCall
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
            style={{ color: "var(--text-tertiary)" }}
          />
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCall()}
            placeholder={t("placeholder")}
            className="w-full pl-9 pr-3 py-2.5 rounded-[10px] text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]"
            style={{
              background: "var(--bg-inset)",
              border: "1px solid var(--border-default)",
              color: "var(--text-primary)",
            }}
          />
        </div>
        <button
          type="button"
          onClick={handleCall}
          disabled={loading}
          className="btn-marketing-blue px-5 py-2.5 text-sm whitespace-nowrap"
        >
          {loading ? t("calling") : t("callMe")}
        </button>
      </div>
      {status && (
        <p
          className="text-xs text-center flex items-center justify-center gap-1"
          style={{ color: "var(--accent-secondary)" }}
          role="status"
        >
          <Phone className="w-3 h-3 animate-pulse" /> {status}
        </p>
      )}
      {error && (
        <p
          className="text-xs text-center"
          style={{ color: "var(--accent-danger)" }}
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}
