"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { toast } from "sonner";
import { useWorkspace } from "@/components/WorkspaceContext";
import { ArrowLeft, Copy, Check } from "lucide-react";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

interface WidgetConfig {
  enabled: boolean;
  accent_color: string;
  position: "bottom-left" | "bottom-right";
  greeting_message: string;
  agent_name: string;
  avatar_url?: string;
  auto_open_delay: number;
}

const DEFAULT_CONFIG: WidgetConfig = {
  enabled: false,
  accent_color: "#3b82f6",
  position: "bottom-right",
  greeting_message: "Hi! How can we help you today?",
  agent_name: "Support Agent",
  avatar_url: "",
  auto_open_delay: 0,
};

export default function ChatWidgetSettingsPage() {
  const t = useTranslations("chatWidget");
  const { workspaceId } = useWorkspace();
  const [config, setConfig] = useState<WidgetConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  // Load configuration
  useEffect(() => {
    if (!workspaceId) return;

    const loadConfig = async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `/api/chat-widget/config?workspace_id=${encodeURIComponent(workspaceId)}`,
          { credentials: "include" }
        );
        if (res.ok) {
          const data = (await res.json()) as Partial<WidgetConfig>;
          setConfig({ ...DEFAULT_CONFIG, ...data });
        }
      } catch (error) {
        toast.error(t("toast.loadFailed"));
      } finally {
        setLoading(false);
      }
    };

    loadConfig();
  }, [workspaceId]);

  // Save configuration
  const handleSave = async () => {
    if (!workspaceId || saving) return;

    setSaving(true);
    try {
      const res = await fetch("/api/chat-widget/config", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      if (!res.ok) {
        const errorData = (await res.json().catch(() => ({
          error: t("toast.unknownError"),
        }))) as { error?: string };
        toast.error(t("toast.saveFailed"));
        return;
      }

      toast.success(t("toast.saved"));
    } catch (error) {
      toast.error(t("toast.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  // Generate embed code
  const getEmbedCode = () => {
    const origin =
      process.env.NEXT_PUBLIC_APP_URL || "https://app.revenueoperator.ai";
    return `<script src="${origin}/api/chat-widget/embed?workspace_id=${encodeURIComponent(
      workspaceId || ""
    )}"></script>`;
  };

  // Copy embed code to clipboard
  const handleCopyEmbed = async () => {
    try {
      await navigator.clipboard.writeText(getEmbedCode());
      setCopied(true);
      toast.success(t("toast.embedCopied"));
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error(t("toast.copyFailed"));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-[var(--text-secondary)]">{t("loading")}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-[var(--border-default)] px-6 py-4">
        <div className="mb-4">
          <Breadcrumbs items={[
            { label: "Home", href: "/app" },
            { label: "Settings", href: "/app/settings" },
            { label: "Chat widget" }
          ]} />
        </div>
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Live Chat Widget</h1>
        </div>
        <p className="text-sm text-[var(--text-secondary)] ml-11">
          Configure and customize your live chat widget for your website
        </p>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-3 gap-8">
          {/* Settings Panel */}
          <div className="col-span-2 space-y-6">
            {/* Enable/Disable */}
            <div className="border border-[var(--border-default)] rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                    Enable Chat Widget
                  </label>
                  <p className="text-xs text-[var(--text-tertiary)]">
                    Turn on to display the chat widget on your website
                  </p>
                </div>
                <button
                  onClick={() => setConfig({ ...config, enabled: !config.enabled })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    config.enabled ? "bg-[var(--accent-primary)]" : "bg-[var(--bg-card)]"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      config.enabled ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Color Picker */}
            <div className="border border-[var(--border-default)] rounded-lg p-4">
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-3">
                Accent Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={config.accent_color}
                  onChange={(e) =>
                    setConfig({ ...config, accent_color: e.target.value })
                  }
                  className="w-16 h-10 rounded border border-[var(--border-medium)] cursor-pointer"
                />
                <input
                  type="text"
                  value={config.accent_color}
                  onChange={(e) =>
                    setConfig({ ...config, accent_color: e.target.value })
                  }
                  className="flex-1 px-3 py-2 border border-[var(--border-medium)] rounded-lg text-sm font-mono"
                  placeholder="#3b82f6"
                />
              </div>
            </div>

            {/* Position */}
            <div className="border border-[var(--border-default)] rounded-lg p-4">
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-3">
                Widget Position
              </label>
              <div className="grid grid-cols-2 gap-3">
                {["bottom-left", "bottom-right"].map((pos) => (
                  <button
                    key={pos}
                    onClick={() =>
                      setConfig({
                        ...config,
                        position: pos as "bottom-left" | "bottom-right",
                      })
                    }
                    className={`py-2 px-3 rounded-lg border transition-colors ${
                      config.position === pos
                        ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]"
                        : "border-[var(--border-medium)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                    }`}
                  >
                    {pos === "bottom-left" ? "Bottom Left" : "Bottom Right"}
                  </button>
                ))}
              </div>
            </div>

            {/* Greeting Message */}
            <div className="border border-[var(--border-default)] rounded-lg p-4">
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Greeting Message
              </label>
              <textarea
                value={config.greeting_message}
                onChange={(e) =>
                  setConfig({ ...config, greeting_message: e.target.value })
                }
                className="w-full px-3 py-2 border border-[var(--border-medium)] rounded-lg text-sm focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
                rows={3}
              />
            </div>

            {/* Agent Name */}
            <div className="border border-[var(--border-default)] rounded-lg p-4">
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Agent Name
              </label>
              <input
                type="text"
                value={config.agent_name}
                onChange={(e) =>
                  setConfig({ ...config, agent_name: e.target.value })
                }
                className="w-full px-3 py-2 border border-[var(--border-medium)] rounded-lg text-sm focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
                placeholder="Support Agent"
              />
            </div>

            {/* Avatar URL */}
            <div className="border border-[var(--border-default)] rounded-lg p-4">
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Avatar URL (Optional)
              </label>
              <input
                type="url"
                value={config.avatar_url || ""}
                onChange={(e) =>
                  setConfig({ ...config, avatar_url: e.target.value })
                }
                className="w-full px-3 py-2 border border-[var(--border-medium)] rounded-lg text-sm focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
                placeholder="https://example.com/avatar.jpg"
              />
            </div>

            {/* Auto-Open Delay */}
            <div className="border border-[var(--border-default)] rounded-lg p-4">
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-3">
                Auto-Open Delay: {config.auto_open_delay === 0 ? "Disabled" : `${config.auto_open_delay}s`}
              </label>
              <input
                type="range"
                min="0"
                max="30"
                step="1"
                value={config.auto_open_delay}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    auto_open_delay: parseInt(e.target.value),
                  })
                }
                className="w-full"
              />
              <p className="text-xs text-[var(--text-tertiary)] mt-2">
                Automatically open the chat widget after the specified seconds. Set to 0 to disable.
              </p>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/90 disabled:bg-[var(--bg-card)] text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              {saving ? "Saving..." : "Save Configuration"}
            </button>
          </div>

          {/* Preview & Embed Panel */}
          <div className="space-y-6">
            {/* Live Preview */}
            <div className="border border-[var(--border-default)] rounded-lg p-4">
              <h3 className="text-sm font-medium text-[var(--text-primary)] mb-4">
                Live Preview
              </h3>
              <div
                className="relative w-full h-80 bg-[var(--bg-hover)] rounded-lg border border-[var(--border-medium)] overflow-hidden flex items-end justify-end p-4"
                style={{ backgroundColor: "#f3f4f6" }}
              >
                {/* Chat bubble preview */}
                {config.enabled && (
                  <div
                    className="flex flex-col gap-2 w-72 bg-white rounded-lg shadow-lg border border-[var(--border-default)]"
                  >
                    <div
                      className="px-4 py-3 rounded-t-lg text-white flex items-center justify-between"
                      style={{ backgroundColor: config.accent_color }}
                    >
                      <span className="font-medium text-sm">
                        {config.agent_name}
                      </span>
                      <button className="text-white hover:opacity-80">
                        ✕
                      </button>
                    </div>
                    <div className="px-4 py-3 text-sm text-[var(--text-primary)] border-b border-[var(--border-default)]">
                      {config.greeting_message}
                    </div>
                    <div className="px-4 py-3 border-t border-[var(--border-default)]">
                      <input
                        type="text"
                        placeholder="Type your message..."
                        className="w-full px-2 py-1 border border-[var(--border-medium)] rounded text-xs"
                        readOnly
                      />
                    </div>
                  </div>
                )}
                {!config.enabled && (
                  <div className="text-center text-[var(--text-tertiary)]">
                    <p className="text-sm">Enable the widget above to see a live preview</p>
                  </div>
                )}
              </div>
            </div>

            {/* Embed Code */}
            <div className="border border-[var(--border-default)] rounded-lg p-4">
              <h3 className="text-sm font-medium text-[var(--text-primary)] mb-3">
                Embed Code
              </h3>
              <div className="bg-[var(--bg-hover)] border border-[var(--border-medium)] rounded p-3 mb-3 overflow-auto">
                <code className="text-xs text-[var(--text-primary)] font-mono break-words">
                  {getEmbedCode()}
                </code>
              </div>
              <button
                onClick={handleCopyEmbed}
                className="w-full flex items-center justify-center gap-2 bg-[var(--bg-primary)] hover:bg-[var(--bg-primary)] text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy Embed Code
                  </>
                )}
              </button>
            </div>

            {/* Instructions */}
            <div className="bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)] rounded-lg p-4">
              <h4 className="text-sm font-medium text-[var(--accent-primary)] mb-2">
                How to Use
              </h4>
              <ol className="text-xs text-[var(--accent-primary)] space-y-1 list-decimal list-inside">
                <li>Copy the embed code above</li>
                <li>Paste it into your website HTML</li>
                <li>The widget will load automatically</li>
                <li>Visitors can start chatting right away</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
