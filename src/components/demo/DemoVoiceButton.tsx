"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Phone, PhoneCall, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

type CallStatus = "idle" | "calling" | "ringing" | "success" | "error" | "callback";

export function DemoVoiceButton() {
  const t = useTranslations("demoVoice");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<CallStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset status after showing success/error for a while
  useEffect(() => {
    if (status === "success" || status === "callback") {
      timerRef.current = setTimeout(() => {
        setStatus("idle");
        setMessage(null);
      }, 15_000);
    } else if (status === "error") {
      timerRef.current = setTimeout(() => {
        setStatus("idle");
        setMessage(null);
      }, 8_000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [status]);

  const handleCall = useCallback(async () => {
    const value = phone.trim();
    const digits = value.replace(/\D/g, "");
    if (!value || digits.length < 7 || digits.length > 15) {
      setStatus("error");
      setMessage(t("enterPhone"));
      inputRef.current?.focus();
      return;
    }

    setStatus("calling");
    setMessage(null);

    // Simulate "ringing" state for UX
    const ringTimer = setTimeout(() => setStatus("ringing"), 1_200);

    const controller = new AbortController();
    const abortTimer = setTimeout(() => controller.abort(), 15_000);

    try {
      const res = await fetch("/api/demo/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone_number: value,
          source: "website_hero",
          page: typeof window !== "undefined" ? window.location.pathname : "",
        }),
        signal: controller.signal,
      });
      clearTimeout(abortTimer);
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
        error?: string;
        callback_requested?: boolean;
      };

      clearTimeout(ringTimer);

      if (res.ok && data.ok) {
        if (data.callback_requested) {
          setStatus("callback");
          setMessage(data.message ?? "We'll call you back shortly with a live demo!");
        } else {
          setStatus("success");
          setMessage(data.message ?? t("callingNow"));
        }
      } else {
        setStatus("error");
        setMessage(data.error ?? t("couldNotStart"));
      }
    } catch {
      clearTimeout(abortTimer);
      clearTimeout(ringTimer);
      setStatus("error");
      setMessage(t("couldNotStart"));
    }
  }, [phone, t]);

  const isLoading = status === "calling" || status === "ringing";
  const isSuccess = status === "success";
  const isCallback = status === "callback";
  const isError = status === "error";

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-md">
      {/* Input + Button Row */}
      <div className="w-full flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <PhoneCall
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors"
            style={{
              color: isError
                ? "var(--accent-danger)"
                : isSuccess
                  ? "var(--accent-secondary)"
                  : "var(--text-tertiary)",
            }}
          />
          <input
            ref={inputRef}
            type="tel"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              if (status === "error") {
                setStatus("idle");
                setMessage(null);
              }
            }}
            onKeyDown={(e) => e.key === "Enter" && !isLoading && handleCall()}
            placeholder="+1 (555) 123-4567"
            disabled={isLoading}
            className="w-full pl-9 pr-3 py-3 rounded-xl text-sm transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] disabled:opacity-60"
            style={{
              background: "var(--bg-inset)",
              border: `1.5px solid ${isError ? "var(--accent-danger)" : isSuccess ? "var(--accent-secondary)" : "var(--border-default)"}`,
              color: "var(--text-primary)",
            }}
            aria-label="Phone number"
          />
        </div>
        <button
          type="button"
          onClick={handleCall}
          disabled={isLoading || isSuccess}
          className="btn-marketing-blue px-6 py-3 text-sm font-medium whitespace-nowrap rounded-xl transition-all duration-200 flex items-center justify-center gap-2 min-w-[140px]"
          style={{
            opacity: isLoading ? 0.85 : 1,
          }}
        >
          {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
          {isSuccess && <CheckCircle className="w-4 h-4" />}
          {status === "idle" && <Phone className="w-4 h-4" />}
          {isError && <Phone className="w-4 h-4" />}
          {status === "idle" && t("callMe")}
          {status === "calling" && "Connecting..."}
          {status === "ringing" && "Ringing..."}
          {isSuccess && "Calling you!"}
          {isCallback && "Requested!"}
          {isError && "Try Again"}
        </button>
      </div>

      {/* Status Messages */}
      {(isSuccess || isCallback) && message && (
        <div
          className="w-full text-center text-xs px-3 py-2.5 rounded-lg flex items-center justify-center gap-2 animate-in fade-in slide-in-from-bottom-2"
          style={{
            background: "rgba(34, 197, 94, 0.08)",
            color: "var(--accent-secondary)",
            border: "1px solid rgba(34, 197, 94, 0.15)",
          }}
          role="status"
        >
          <Phone className="w-3.5 h-3.5 animate-pulse flex-shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {isError && message && (
        <div
          className="w-full text-center text-xs px-3 py-2.5 rounded-lg flex items-center justify-center gap-2 animate-in fade-in slide-in-from-bottom-2"
          style={{
            background: "rgba(239, 68, 68, 0.08)",
            color: "var(--accent-danger)",
            border: "1px solid rgba(239, 68, 68, 0.15)",
          }}
          role="alert"
        >
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* Trust Signal */}
      {status === "idle" && (
        <p
          className="text-[10px] text-center opacity-60 leading-tight"
          style={{ color: "var(--text-tertiary)" }}
        >
          Free demo call. No signup required. Include your country code.
        </p>
      )}
    </div>
  );
}
