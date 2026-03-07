"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface DemoConfig {
  publicKey: string | null;
  assistantId: string | null;
}

const CONNECTION_TIMEOUT_MS = 15000;

function getErrorMessage(e: unknown): string {
  if (e && typeof e === "object" && "message" in e) {
    const m = (e as { message?: unknown }).message;
    if (typeof m === "string" && m.trim()) return m.trim();
  }
  if (e && typeof e === "object" && "error" in e) {
    const m = (e as { error?: unknown }).error;
    if (typeof m === "string" && m.trim()) return m.trim();
  }
  return "Voice call failed. Please try again.";
}

export function DemoVoiceButton() {
  const [config, setConfig] = useState<DemoConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vapi, setVapi] = useState<{ start: (id: string) => Promise<unknown>; stop: () => void } | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch("/api/vapi/demo-config", { credentials: "include" })
      .then((r) => r.json())
      .then((data: DemoConfig) => setConfig(data))
      .catch(() => setConfig({ publicKey: null, assistantId: null }));
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const clearConnectionTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const startCall = useCallback(async () => {
    if (!config?.publicKey || !config?.assistantId) {
      setError("Voice demo not configured");
      return;
    }
    setError(null);
    setLoading(true);
    clearConnectionTimeout();

    const finishWithError = (msg: string) => {
      clearConnectionTimeout();
      setError(msg);
      setLoading(false);
      setActive(false);
      setVapi(null);
    };

    try {
      const { default: Vapi } = await import("@vapi-ai/web");
      const client = new Vapi(config.publicKey);
      setVapi(client);

      client.on("error", (e: unknown) => {
        finishWithError(getErrorMessage(e));
      });

      client.on("call-start", () => {
        clearConnectionTimeout();
        setActive(true);
        setError(null);
      });
      client.on("call-end", () => {
        setActive(false);
        setVapi(null);
      });

      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        finishWithError("Connection timed out. Check your microphone and try again.");
      }, CONNECTION_TIMEOUT_MS);

      await client.start(config.assistantId);
    } catch (err) {
      finishWithError(
        err instanceof Error
          ? (err.message?.trim() || "Could not start voice call.")
          : typeof err === "string"
            ? err
            : "Could not start voice call. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [config, clearConnectionTimeout]);

  const endCall = useCallback(() => {
    if (vapi) {
      vapi.stop();
      setActive(false);
      setVapi(null);
    }
  }, [vapi]);

  const configured = Boolean(config?.publicKey && config?.assistantId);

  return (
    <div className="flex flex-col items-center gap-2">
      {!configured && config !== null ? (
        <p className="text-xs text-zinc-500 text-center">Voice demo — configure in app</p>
      ) : null}
      {active ? (
        <button
          type="button"
          onClick={endCall}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-500/90 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-500"
          aria-label="End voice call"
        >
          End call
        </button>
      ) : configured ? (
        <button
          type="button"
          onClick={startCall}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black hover:bg-zinc-100 disabled:opacity-60"
          aria-label="Start voice call with AI"
        >
          {loading ? "Connecting…" : "Talk with voice"}
        </button>
      ) : (
        <button
          type="button"
          disabled
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-700 px-4 py-2.5 text-sm font-medium text-zinc-400 cursor-not-allowed"
          aria-label="Voice demo not configured"
        >
          Talk with voice
        </button>
      )}
      {error && (
        <div className="flex flex-col items-center gap-2 w-full">
          <p className="text-xs text-red-400 text-center" role="alert">
            {error}
          </p>
          <button
            type="button"
            onClick={() => {
              setError(null);
              startCall();
            }}
            className="text-xs font-medium text-zinc-400 hover:text-white transition-colors"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
