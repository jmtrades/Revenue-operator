"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

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
  const tBreadcrumbs = useTranslations("breadcrumbs");
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
        toast.error(t("toast.loadFailed"));
      } finally {
        setLoading(false);
      }
    };
    loadConfig();
  }, [t]);

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
      toast.error(t("toast.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 md:p-8 max-w-6xl mx-auto">
        <div className="skeleton-shimmer">
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
      <Breadcrumbs items={[
        { label: tBreadcrumbs("home"), href: "/app" },
        { label: tBreadcrumbs("settings"), href: "/app/settings" },
        { label: tBreadcrumbs("whiteLabel") }
      ]} />
      <div className="mb-8 mt-6">
        <h1 className="text-2xl md:text-3xl font-bold tracking-[-0.025em] text-[var(--text-primary)]">{t("title")}</h1>
        <p className="text-[13px] text-[var(--text-secondary)] mt-1.5 leading-relaxed">
          {t("description")}
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Settings Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Brand Name */}
          <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6">
            <label className="block text-sm font-semibold text-[var(--text-primary)] mb-3">{t("fields.brandName.label")}</label>
            <input
              type="text"
              value={config.brand_name}
              onChange={(e) => setConfig({ ...config, brand_name: e.target.value })}
              placeholder={t("fields.brandName.placeholder")}
              className="w-full px-4 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-inset)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
            />
            <p className="text-xs text-[var(--text-tertiary)] mt-2">{t("fields.brandName.help")}</p>
          </div>

          {/* Logo URL */}
          <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6">
            <label className="block text-sm font-semibold text-[var(--text-primary)] mb-3">{t("fields.logoUrl.label")}</label>
            <input
              type="url"
              value={config.logo_url}
              onChange={(e) => setConfig({ ...config, logo_url: e.target.value })}
              placeholder={t("fields.logoUrl.placeholder")}
              className="w-full px-4 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-inset)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
            />
            <p className="text-xs text-[var(--text-tertiary)] mt-2">{t("fields.logoUrl.help")}</p>
          </div>

          {/* Favicon URL */}
          <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6">
            <label className="block text-sm font-semibold text-[var(--text-primary)] mb-3">{t("fields.faviconUrl.label")}</label>
            <input
              type="url"
              value={config.favicon_url}
              onChange={(e) => setConfig({ ...config, favicon_url: e.target.value })}
              placeholder={t("fields.faviconUrl.placeholder")}
              className="w-full px-4 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-inset)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
            />
            <p className="text-xs text-[var(--text-tertiary)] mt-2">{t("fields.faviconUrl.help")}</p>
          </div>

          {/* Colors Section */}
          <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6">
            <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">{t("fields.brandColors.label")}</h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-medium text-[var(--text-secondary)] block mb-2">{t("fields.brandColors.primary")}</label>
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
                <label className="text-xs font-medium text-[var(--text-secondary)] block mb-2">{t("fields.brandColors.secondary")}</label>
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
                <label className="text-xs font-medium text-[var(--text-secondary)] block mb-2">{t("fields.brandColors.accent")}</label>
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
            <label className="block text-sm font-semibold text-[var(--text-primary)] mb-3">{t("fields.customDomain.label")}</label>
            <input
              type="text"
              value={config.custom_domain}
              onChange={(e) => setConfig({ ...config, custom_domain: e.target.value })}
              placeholder={t("fields.customDomain.placeholder")}
              className="w-full px-4 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-inset)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
            />
            <p className="text-xs text-[var(--text-tertiary)] mt-2">
              {t("fields.customDomain.help")}
            </p>
          </div>

          {/* Support Contact */}
          <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-[var(--text-primary)] mb-3">{t("fields.supportEmail.label")}</label>
                <input
                  type="email"
                  value={config.support_email}
                  onChange={(e) => setConfig({ ...config, support_email: e.target.value })}
                  placeholder={t("fields.supportEmail.placeholder")}
                  className="w-full px-4 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-inset)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[var(--text-primary)] mb-3">{t("fields.supportUrl.label")}</label>
                <input
                  type="url"
                  value={config.support_url}
                  onChange={(e) => setConfig({ ...config, support_url: e.target.value })}
                  placeholder={t("fields.supportUrl.placeholder")}
                  className="w-full px-4 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-inset)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
                />
              </div>
            </div>
          </div>

          {/* Login Background */}
          <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6">
            <label className="block text-sm font-semibold text-[var(--text-primary)] mb-3">{t("fields.loginBackgroundUrl.label")}</label>
            <input
              type="url"
              value={config.login_background_url}
              onChange={(e) => setConfig({ ...config, login_background_url: e.target.value })}
              placeholder={t("fields.loginBackgroundUrl.placeholder")}
              className="w-full px-4 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-inset)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
            />
            <p className="text-xs text-[var(--text-tertiary)] mt-2">{t("fields.loginBackgroundUrl.help")}</p>
          </div>

          {/* Custom CSS */}
          <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6">
            <label className="block text-sm font-semibold text-[var(--text-primary)] mb-3">{t("fields.customCss.label")}</label>
            <textarea
              value={config.custom_css}
              onChange={(e) => setConfig({ ...config, custom_css: e.target.value })}
              placeholder={t("fields.customCss.placeholder")}
              rows={6}
              className="w-full px-4 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-inset)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
            />
            <p className="text-xs text-[var(--text-tertiary)] mt-2">{t("fields.customCss.help")}</p>
          </div>

          {/* Hide Powered By */}
          <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1">{t("fields.hidePoweredBy.label")}</label>
                <p className="text-xs text-[var(--text-tertiary)]">{t("fields.hidePoweredBy.description")}</p>
              </div>
              <button
                onClick={() => setConfig({ ...config, powered_by_hidden: !config.powered_by_hidden })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-[background-color] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] active:scale-[0.97] ${
                  config.powered_by_hidden ? "bg-[var(--accent-primary)]" : "bg-[var(--bg-inset)]"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-[transform] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] ${
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
              className="flex-1 bg-[var(--accent-primary)] text-white font-semibold py-3 rounded-lg hover:opacity-90 transition-[background-color,opacity,transform] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? t("buttons.saving") : t("buttons.save")}
            </button>
          </div>
        </div>

        {/* Preview Card */}
        <div className="lg:col-span-1">
          <div className="sticky top-6 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6">
            <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">{t("preview.title")}</h2>
            <div className="space-y-4">
              {/* Logo Preview */}
              <div className="bg-[var(--bg-inset)] rounded-lg p-4 h-24 flex items-center justify-center border border-[var(--border-default)]">
                {config.logo_url ? (
                  // Arbitrary user URL — next/image would require remotePatterns for every host; preview only.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={config.logo_url}
                    alt="Logo"
                    className="max-h-20 max-w-full object-contain"
                    onError={() => <span className="text-xs text-[var(--text-tertiary)]">{t("preview.invalidImageUrl")}</span>}
                  />
                ) : (
                  <span className="text-xs text-[var(--text-tertiary)]">{t("preview.logoPreview")}</span>
                )}
              </div>

              {/* Brand Name Preview */}
              <div>
                <p className="text-xs text-[var(--text-tertiary)] mb-2">{t("preview.brandName")}</p>
                <p className="text-lg font-semibold text-[var(--text-primary)]">
                  {config.brand_name || t("preview.yourBrandName")}
                </p>
              </div>

              {/* Colors Preview */}
              <div>
                <p className="text-xs text-[var(--text-tertiary)] mb-2">{t("preview.colors")}</p>
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
                <p className="text-xs text-[var(--text-tertiary)] mb-2">{t("preview.sampleButton")}</p>
                <button
                  style={{ backgroundColor: config.accent_color }}
                  className="w-full text-white font-medium py-2 rounded-lg transition-[transform,opacity] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] active:scale-[0.97] hover:opacity-90"
                >
                  {t("preview.buttonText")}
                </button>
              </div>

              {/* Domain Preview */}
              {config.custom_domain && (
                <div className="pt-4 border-t border-[var(--border-default)]">
                  <p className="text-xs text-[var(--text-tertiary)] mb-1">{t("preview.customDomain")}</p>
                  <p className="text-sm font-mono text-[var(--text-primary)] break-all">
                    https://{config.custom_domain}
                  </p>
                </div>
              )}

              {/* Support Info */}
              {(config.support_email || config.support_url) && (
                <div className="pt-4 border-t border-[var(--border-default)]">
                  <p className="text-xs text-[var(--text-tertiary)] mb-2">{t("preview.support")}</p>
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
