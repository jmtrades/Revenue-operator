"use client";

import { useState, useEffect, useCallback } from "react";

interface DemoConfig {
  publicKey: string | null;
  assistantId: string | null;
}

export function DemoVoiceButton() {
  const [config, setConfig] = useState<DemoConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vapi, setVapi] = useState<{ start: (id: string) => Promise<unknown>; stop: () => void } | null>(null);

  useEffect(() => {
    fetch("/api/vapi/demo-config", { credentials: "include" })
      .then((r) => r.json())
      .then((data: DemoConfig) => setConfig(data))
      .catch(() => setConfig({ publicKey: null, assistantId: null }));
  }, []);

  const startCall = useCallback(async () => {
    if (!config?.publicKey || !config?.assistantId) {
      setError("Voice demo not configured");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const { default: Vapi } = await import("@vapi-ai/web");
      const client = new Vapi(config.publicKey);
      setVapi(client);

      client.on("call-start", () => setActive(true));
      client.on("call-end", () => {
        setActive(false);
        setVapi(null);
      });

      await client.start(config.assistantId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start call");
      setLoading(false);
    } finally {
      setLoading(false);
    }
  }, [config]);

  const endCall = useCallback(() => {
    if (vapi) {
      vapi.stop();
      setActive(false);
      setVapi(null);
    }
  }, [vapi]);

  if (!config?.publicKey || !config?.assistantId) return null;

  return (
    <div className="flex flex-col items-center gap-2">
      {active ? (
        <button
          type="button"
          onClick={endCall}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-500/90 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-500"
          aria-label="End voice call"
        >
          End call
        </button>
      ) : (
        <button
          type="button"
          onClick={startCall}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black hover:bg-zinc-100 disabled:opacity-60"
          aria-label="Start voice call with AI"
        >
          {loading ? "Connecting…" : "Talk with voice"}
        </button>
      )}
      {error && (
        <p className="text-xs text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
