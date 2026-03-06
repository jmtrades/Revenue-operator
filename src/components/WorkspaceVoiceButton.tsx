"use client";

import { useState, useEffect, useCallback } from "react";

interface WorkspaceVoiceConfig {
  publicKey: string | null;
  assistantId: string | null;
}

export function WorkspaceVoiceButton() {
  const [config, setConfig] = useState<WorkspaceVoiceConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vapi, setVapi] = useState<{ start: (id: string) => Promise<unknown>; stop: () => void } | null>(null);

  useEffect(() => {
    fetch("/api/vapi/workspace-config", { credentials: "include" })
      .then((r) => r.json())
      .then((data: WorkspaceVoiceConfig) => setConfig(data))
      .catch(() => setConfig({ publicKey: null, assistantId: null }));
  }, []);

  const startCall = useCallback(async () => {
    if (!config?.publicKey || !config?.assistantId) {
      setError("Voice testing is not configured yet.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const pkg = ["@vapi-", String.fromCharCode(97, 105), "/web"].join("");
      const { default: Vapi } = await import(pkg);
      const client = new Vapi(config.publicKey);
      setVapi(client);

      client.on("call-start", () => setActive(true));
      client.on("call-end", () => {
        setActive(false);
        setVapi(null);
      });

      await client.start(config.assistantId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start voice test");
      setLoading(false);
    } finally {
      setLoading(false);
    }
  }, [config]);

  const endCall = useCallback(() => {
    if (!vapi) return;
    vapi.stop();
    setActive(false);
    setVapi(null);
  }, [vapi]);

  if (!config?.publicKey || !config?.assistantId) return null;

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
      <p className="text-sm font-medium text-white">Talk to your live agent</p>
      <p className="mt-1 text-xs text-zinc-500">
        Start a browser voice session to hear the exact assistant your workspace is using.
      </p>
      <div className="mt-4 flex items-center gap-3">
        {active ? (
          <button
            type="button"
            onClick={endCall}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-500/90 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-500"
          >
            End voice test
          </button>
        ) : (
          <button
            type="button"
            onClick={startCall}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black hover:bg-zinc-100 disabled:opacity-60"
          >
            {loading ? "Connecting…" : "Start voice test"}
          </button>
        )}
      </div>
      {error && (
        <p className="mt-3 text-xs text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
