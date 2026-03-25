"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { toast } from "sonner";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";

interface WhiteLabelConfig {
  id?: string;
  workspace_id?: string;
  brand_name: string;
  logo_url: string;
  favicon_url: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  custom_domain: string;
  support_email: string;
  support_url: string;
  powered_by_hidden: boolean;
  custom_css: string;
  login_background_url: string;
}

export default function WhiteLabelSettingsPage() {
  const t = useTranslations("whiteLabel");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<WhiteLabelConfig>({
    brand_name: "",
    logo_url: "",
    favicon_url: "",
    primary_color: "#3B82F6",
    secondary_color: "#10B981",
    accent_color: "#F59E0B",
    custom_domain: "",
    support_email: "",
    support_url: "",
    powered_by_hidden: false,
    custom_css: "",
    login_background_url: "",
  });

  const lastSavedRef = useRef<WhiteLabelConfig>(JSON.parse(JSON.stringify(config)));
  const isDirty = JSON.stringify(config) !== JSON.stringify(lastSavedRef.current);
  useUnsavedChanges(isDirty);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const res = await fetch("/api/white-label/config", { credentials: "include" });
        if (!res.ok) throw new Error("Failed to load config");
        const data = await res.json();
        if (data.config) {
          setConfig(data.config);
          lastSavedRef.current = data.config;
        }
      } catch (err) {
        console.error("[white-label settings] Failed to load config:", err);
        toast.error(t("toast.loadFailed"));
      } finally {
        setLoading(false);
      }
    };
    loadConfig();
  }, []);

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/white-label/config", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!res.ok) throw new Error("Failed to save config");
      const data = await res.json();
      lastSavedRef.current = data.config;
      setConfig(data.config);
      toast.success(t("toast.saved"));
    } catch (err) {
      console.error("[white-label settings] Failed to save:", err);
      toast.error(t("toast.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 md:p-8 max-w-6xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 w-64 bg-[var(--bg-inset)] rounded mb-6" />
          <div className="space-y-4">
            <div className="h-10 bg-[var(--bg-inset)] rounded" />
            <div className="h-10 bg-[var(--bg-inset)] rounded" />
            <div className="h-10 bg-[var(--bg-inset)] rounded" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-semibold text-[var(--text-primary)]">White-Label Settings</h1>
        <p className="text-sm text-[var(--text-tertiary)] mt-2">
          Customize the appearance and branding for your platform
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Settings Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Brand Name */}
          <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6">
            <label className="block text-sm font-semibold text-[var(--text-primary)] mb-3">Brand Name</label>
            <input
              type="text"
              value={config.brand_name}
              onChange={(e) => setConfig({ ...config, brand_name: e.target.value })}
              placeholder="e.g., Acme Inc."
              className="w-full px-4 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-inset)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
            />
            <p className="text-xs text-[var(--text-tertiary)] mt-2">Used in emails, headers, and branding elements</p>
          </div>

          {/* Logo URL */}
          <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6">
            <label className="block text-sm font-semibold text-[var(--text-primary)] mb-3">Logo URL</label>
            <input
              type="url"
              value={config.logo_url}
              onChange={(e) => setConfig({ ...config, logo_url: e.target.value })}
              placeholder="https://example.com/logo.png"
              className="w-full px-4 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-inset)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
            />
            <p className="text-xs text-[var(--text-tertiary)] mt-2">PNG or SVG recommended. Max 200x200px</p>
          </div>

          {/* Favicon URL */}
          <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6">
            <label className="block text-sm font-semibold text-[var(--text-primary)] mb-3">Favicon URL</label>
            <input
              type="url"
              value={config.favicon_url}
              onChange={(e) => setConfig({ ...config, favicon_url: e.target.value })}
              placeholder="https://example.com/favicon.ico"
              className="w-full px-4 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-inset)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
            />
            <p className="text-xs text-[var(--text-tertiary)] mt-2">ICO or PNG format. Displayed in browser tab</p>
          </div>

          {/* Colors Section */}
          <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6">
            <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Brand Colors</h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-medium text-[var(--text-secondary)] block mb-2">Primary</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={config.primary_color}
                    onChange={(e) => setConfig({ ...config, primary_color: e.target.value })}
                    className="h-10 w-12 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={config.primary_color}
                    onChange={(e) => setConfig({ ...config, primary_color: e.target.value })}
                    className="flex-1 px-3 py-2 rounded border border-[var(--border-default)] bg-[var(--bg-inset)] text-xs font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--text-secondary)] block mb-2">Secondary</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={config.secondary_color}
                    onChange={(e) => setConfig({ ...config, secondary_color: e.target.value })}
                    className="h-10 w-12 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={config.secondary_color}
                    onChange={(e) => setConfig({ ...config, secondary_color: e.target.value })}
                    className="flex-1 px-3 py-2 rounded border border-[var(--border-default)] bg-[var(--bg-inset)] text-xs font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--text-secondary)] block mb-2">Accent</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={config.accent_color}
                    onChange={(e) => setConfig({ ...config, accent_color: e.target.value })}
                    className="h-10 w-12 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={config.accent_color}
                    onChange={(e) => setConfig({ ...config, accent_color: e.target.value })}
                    className="flex-1 px-3 py-2 rounded border border-[var(--border-default)] bg-[var(--bg-inset)] text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Custom Domain */}
          <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6">
            <label className="block text-sm font-semibold text-[var(--text-primary)] mb-3">Custom Domain</label>
            <input
              type="text"
              value={config.custom_domain}
              onChange={(e) => setConfig({ ...config, custom_domain: e.target.value })}
              placeholder="app.yourcompany.com"
              className="w-full px-4 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-inset)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
            />
            <p className="text-xs text-[var(--text-tertiary)] mt-2">
              DNS Configuration: Create CNAME record pointing to your platform URL
            </p>
          </div>

          {/* Support Contact */}
          <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-[var(--text-primary)] mb-3">Support Email</label>
                <input
                  type="email"
                  value={config.support_email}
                  onChange={(e) => setConfig({ ...config, support_email: e.target.value })}
                  placeholder="support@example.com"
                  className="w-full px-4 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-inset)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[var(--text-primary)] mb-3">Support URL</label>
                <input
                  type="url"
                  value={config.support_url}
                  onChange={(e) => setConfig({ ...config, support_url: e.target.value })}
                  placeholder="https://support.example.com"
                  className="w-full px-4 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-inset)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
                />
              </div>
            </div>
          </div>

          {/* Login Background */}
          <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6">
            <label className="block text-sm font-semibold text-[var(--text-primary)] mb-3">Login Background URL</label>
            <input
              type="url"
              value={config.login_background_url}
              onChange={(e) => setConfig({ ...config, login_background_url: e.target.value })}
              placeholder="https://example.com/bg.jpg"
              className="w-full px-4 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-inset)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
            />
            <p className="text-xs text-[var(--text-tertiary)] mt-2">JPG or PNG. Used as background on login page</p>
          </div>

          {/* Custom CSS */}
          <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6">
            <label className="block text-sm font-semibold text-[var(--text-primary)] mb-3">Custom CSS</label>
            <textarea
              value={config.custom_css}
              onChange={(e) => setConfig({ ...config, custom_css: e.target.value })}
              placeholder=".header { background-color: #fff; }"
              rows={6}
              className="w-full px-4 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-inset)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
            />
            <p className="text-xs text-[var(--text-tertiary)] mt-2">Advanced styling. Scoped to your white-label instance</p>
          </div>

          {/* Hide Powered By */}
          <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1">Hide Powered By</label>
                <p className="text-xs text-[var(--text-tertiary)]">Remove "Powered by Recall Touch" branding</p>
              </div>
              <button
                onClick={() => setConfig({ ...config, powered_by_hidden: !config.powered_by_hidden })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  config.powered_by_hidden ? "bg-[var(--accent-primary)]" : "bg-[var(--bg-inset)]"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    config.powered_by_hidden ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={!isDirty || saving}
              className="flex-1 bg-[var(--accent-primary)] text-white font-semibold py-3 rounded-lg hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>

        {/* Preview Card */}
        <div className="lg:col-span-1">
          <div className="sticky top-6 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6">
            <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Brand Preview</h2>
            <div className="space-y-4">
              {/* Logo Preview */}
              <div className="bg-[var(--bg-inset)] rounded-lg p-4 h-24 flex items-center justify-center border border-[var(--border-default)]">
                {config.logo_url ? (
                  <img
                    src={config.logo_url}
                    alt="Logo"
                    className="max-h-20 max-w-full object-contain"
                    onError={() => <span className="text-xs text-[var(--text-tertiary)]">Invalid image URL</span>}
                  />
                ) : (
                  <span className="text-xs text-[var(--text-tertiary)]">Logo preview</span>
                )}
              </div>

              {/* Brand Name Preview */}
              <div>
                <p className="text-xs text-[var(--text-tertiary)] mb-2">Brand Name</p>
                <p className="text-lg font-semibold text-[var(--text-primary)]">
                  {config.brand_name || "Your Brand Name"}
                </p>
              </div>

              {/* Colors Preview */}
              <div>
                <p className="text-xs text-[var(--text-tertiary)] mb-2">Colors</p>
                <div className="grid grid-cols-3 gap-2">
                  <div
                    className="h-12 rounded border border-[var(--border-default)]"
                    style={{ backgroundColor: config.primary_color }}
                    title="Primary"
                  />
                  <div
                    className="h-12 rounded border border-[var(--border-default)]"
                    style={{ backgroundColor: config.secondary_color }}
                    title="Secondary"
                  />
                  <div
                    className="h-12 rounded border border-[var(--border-default)]"
                    style={{ backgroundColor: config.accent_color }}
                    title="Accent"
                  />
                </div>
              </div>

              {/* Sample Button */}
              <div>
                <p className="text-xs text-[var(--text-tertiary)] mb-2">Sample Button</p>
                <button
                  style={{ backgroundColor: config.accent_color }}
                  className="w-full text-white font-medium py-2 rounded-lg"
                >
                  Get Started
                </button>
              </div>

              {/* Domain Preview */}
              {config.custom_domain && (
                <div className="pt-4 border-t border-[var(--border-default)]">
                  <p className="text-xs text-[var(--text-tertiary)] mb-1">Custom Domain</p>
                  <p className="text-sm font-mono text-[var(--text-primary)] break-all">
                    https://{config.custom_domain}
                  </p>
                </div>
              )}

              {/* Support Info */}
              {(config.support_email || config.support_url) && (
                <div className="pt-4 border-t border-[var(--border-default)]">
                  <p className="text-xs text-[var(--text-tertiary)] mb-2">Support</p>
                  {config.support_email && (
                    <p className="text-xs text-[var(--text-primary)]">{config.support_email}</p>
                  )}
                  {config.support_url && (
                    <p className="text-xs text-[var(--text-primary)]">{config.support_url}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
