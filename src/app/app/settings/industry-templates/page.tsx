"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { toast } from "sonner";
import { Copy, ExternalLink, ChevronDown, ChevronUp, Loader2, Check } from "lucide-react";

interface IndustryTemplate {
  id: string;
  industry_slug: string;
  name: string;
  description: string;
  default_greeting: string;
  default_scripts: Array<{
    name: string;
    trigger: string;
    content: string;
  }>;
  default_faq: Array<{
    q: string;
    a: string;
  }>;
  default_follow_up_cadence: Array<{
    name: string;
    triggers: string[];
    steps: Array<{
      days_before?: number;
      days_after?: number;
      hours_before?: number;
      hours_after?: number;
      minutes_after?: number;
      minutes_before?: number;
      channel: string;
      message: string;
    }>;
  }>;
  recommended_features: string[];
  created_at: string;
  updated_at: string;
}

export default function IndustryTemplatesPage() {
  const _t = useTranslations("common");
  const tNav = useTranslations("nav");
  const tTemplates = useTranslations("industryTemplates");
  const [templates, setTemplates] = useState<IndustryTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);
  const [applyingSlug, setApplyingSlug] = useState<string | null>(null);
  const [appliedSlugs, setAppliedSlugs] = useState<Set<string>>(new Set());
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    templateSlug: string;
    templateName: string;
  }>({ open: false, templateSlug: "", templateName: "" });

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const res = await fetch("/api/industry-templates", {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          setTemplates(data.templates || []);
        } else {
          toast.error(tTemplates("toast.loadFailed"));
        }
      } catch (err) {
        toast.error(tTemplates("toast.loadError"));
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, []);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(tTemplates("toast.copied"));
    } catch {
      toast.error(tTemplates("toast.copyFailed"));
    }
  };

  const handleApplyTemplate = (slug: string, name: string) => {
    setConfirmDialog({
      open: true,
      templateSlug: slug,
      templateName: name,
    });
  };

  const confirmApplyTemplate = async () => {
    const { templateSlug } = confirmDialog;
    setConfirmDialog({ open: false, templateSlug: "", templateName: "" });
    setApplyingSlug(templateSlug);

    try {
      const res = await fetch(
        `/api/industry-templates/${templateSlug}/apply`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (res.ok) {
        setAppliedSlugs((prev) => new Set(prev).add(templateSlug));
        toast.success(
          tTemplates("toast.templateApplied") ||
            "Template applied successfully! Your operator has been updated."
        );
      } else {
        const error = await res.json();
        toast.error(
          error.error ||
            tTemplates("toast.applyFailed") ||
            "Failed to apply template"
        );
      }
    } catch (err) {
      toast.error(
        tTemplates("toast.applyError") || "An error occurred while applying the template"
      );
    } finally {
      setApplyingSlug(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <Breadcrumbs
          items={[
            { label: tNav("settings"), href: "/app/settings" },
            { label: tTemplates("breadcrumb"), href: "/app/settings/industry-templates" },
          ]}
        />
        <div className="skeleton-shimmer">
          <div className="h-8 bg-[var(--bg-inset)] rounded w-48 mb-6" />
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-32 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-default)]" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <Breadcrumbs
        items={[
          { label: tNav("settings"), href: "/app/settings" },
          { label: tTemplates("breadcrumb"), href: "/app/settings/industry-templates" },
        ]}
      />

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">{tTemplates("title")}</h1>
        <p className="text-[var(--text-tertiary)]">
          {tTemplates("description")}
        </p>
      </div>

      {templates.length === 0 ? (
        <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] p-8 text-center">
          <p className="text-[var(--text-tertiary)]">{tTemplates("emptyState")}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {templates.map((template) => (
            <div
              key={template.industry_slug}
              className="border border-[var(--border-default)] rounded-lg bg-[var(--bg-surface)] overflow-hidden hover:border-[var(--border-default)] transition-colors"
            >
              {/* Header - Always visible */}
              <div className="p-4 flex items-start justify-between hover:bg-[var(--bg-inset)]/20 transition-colors">
                <button
                  onClick={() =>
                    setExpandedSlug(
                      expandedSlug === template.industry_slug ? null : template.industry_slug
                    )
                  }
                  className="flex-1 text-left flex items-start gap-4"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h2 className="text-lg font-semibold text-[var(--text-primary)]">{template.name}</h2>
                      <code className="text-xs px-2 py-1 rounded bg-[var(--bg-inset)] text-[var(--text-secondary)]">
                        {template.industry_slug}
                      </code>
                      {appliedSlugs.has(template.industry_slug) && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-[var(--success-bg)]/20 text-[var(--success-fg)]">
                          <Check className="w-3 h-3" />
                          Applied
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[var(--text-tertiary)]">{template.description}</p>
                  </div>
                  <div className="ml-4 flex-shrink-0 text-[var(--text-tertiary)]">
                    {expandedSlug === template.industry_slug ? (
                      <ChevronUp className="w-5 h-5" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                  </div>
                </button>

                {/* Apply button */}
                <button
                  onClick={() =>
                    handleApplyTemplate(template.industry_slug, template.name)
                  }
                  disabled={applyingSlug === template.industry_slug}
                  className="ml-4 flex-shrink-0 px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary)]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {applyingSlug === template.industry_slug ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Applying...
                    </>
                  ) : (
                    "Apply to Operator"
                  )}
                </button>
              </div>

              {/* Expanded content */}
              {expandedSlug === template.industry_slug && (
                <div className="border-t border-[var(--border-default)] p-4 bg-[var(--bg-surface)] space-y-6">
                  {/* Greeting */}
                  <section>
                    <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2 flex items-center justify-between">
                      Default Greeting
                      <button
                        onClick={() => copyToClipboard(template.default_greeting)}
                        className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1"
                        title="Copy greeting"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </h3>
                    <p className="text-sm text-[var(--text-secondary)] bg-[var(--bg-surface)] rounded p-3 italic">
                      &ldquo;{template.default_greeting}&rdquo;
                    </p>
                  </section>

                  {/* Scripts */}
                  <section>
                    <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Call Scripts ({template.default_scripts.length})</h3>
                    <div className="space-y-3">
                      {template.default_scripts.map((script, idx) => (
                        <div key={idx} className="bg-[var(--bg-surface)] rounded p-3 border border-[var(--border-default)]">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="text-sm font-medium text-[var(--text-primary)]">{script.name}</p>
                              <p className="text-xs text-[var(--text-secondary)]">Trigger: {script.trigger}</p>
                            </div>
                            <button
                              onClick={() => copyToClipboard(script.content)}
                              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1 flex-shrink-0"
                              title="Copy script"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          </div>
                          <p className="text-xs text-[var(--text-secondary)]">{script.content}</p>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* FAQ */}
                  <section>
                    <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">FAQ ({template.default_faq.length} items)</h3>
                    <div className="space-y-2">
                      {template.default_faq.map((item, idx) => (
                        <div key={idx} className="bg-[var(--bg-surface)] rounded p-3 border border-[var(--border-default)]">
                          <p className="text-sm font-medium text-[var(--text-primary)] mb-1">{item.q}</p>
                          <p className="text-xs text-[var(--text-secondary)]">{item.a}</p>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Follow-up Cadence */}
                  <section>
                    <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Follow-up Cadence ({template.default_follow_up_cadence.length} sequences)</h3>
                    <div className="space-y-3">
                      {template.default_follow_up_cadence.map((cadence, idx) => (
                        <div key={idx} className="bg-[var(--bg-surface)] rounded p-3 border border-[var(--border-default)]">
                          <p className="text-sm font-medium text-[var(--text-primary)] mb-2">{cadence.name}</p>
                          <div className="text-xs text-[var(--text-tertiary)] mb-2">
                            Triggers: {cadence.triggers.join(", ")}
                          </div>
                          <div className="space-y-1">
                            {cadence.steps.map((step, stepIdx) => {
                              let timing = "";
                              if (step.days_before) timing = `${step.days_before}d before`;
                              if (step.days_after) timing = `${step.days_after}d after`;
                              if (step.hours_before) timing = `${step.hours_before}h before`;
                              if (step.hours_after) timing = `${step.hours_after}h after`;
                              if (step.minutes_before) timing = `${step.minutes_before}m before`;
                              if (step.minutes_after) timing = `${step.minutes_after}m after`;

                              return (
                                <div key={stepIdx} className="text-xs text-[var(--text-tertiary)]">
                                  <span className="inline-block bg-[var(--bg-inset)] px-2 py-0.5 rounded mr-2">
                                    {step.channel.toUpperCase()}
                                  </span>
                                  <span className="text-[var(--text-secondary)]">{timing}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Recommended Features */}
                  <section>
                    <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Recommended Features</h3>
                    <div className="flex flex-wrap gap-2">
                      {template.recommended_features.map((feature, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[var(--bg-inset)] text-[var(--text-primary)]"
                        >
                          {feature.replace(/_/g, " ")}
                        </span>
                      ))}
                    </div>
                  </section>

                  {/* API Info */}
                  <section className="pt-4 border-t border-[var(--border-default)]">
                    <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">API Access</h3>
                    <div className="bg-[var(--bg-surface)] rounded p-3 border border-[var(--border-default)] space-y-2">
                      <div>
                        <p className="text-xs text-[var(--text-secondary)] mb-1">GET single template:</p>
                        <div className="flex items-center gap-2">
                          <code className="text-xs flex-1 bg-[var(--bg-inset)] rounded px-2 py-1 text-[var(--text-secondary)] overflow-auto">
                            /api/industry-templates/{template.industry_slug}
                          </code>
                          <button
                            onClick={() =>
                              copyToClipboard(`/api/industry-templates/${template.industry_slug}`)
                            }
                            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-[var(--text-secondary)] mb-1">View in browser:</p>
                        <Link
                          href={`/api/industry-templates/${template.industry_slug}`}
                          target="_blank"
                          className="inline-flex items-center gap-1 text-xs text-[var(--accent-primary)] hover:text-[var(--accent-primary)]/80"
                        >
                          Open API endpoint
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  </section>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* API Documentation */}
      <div className="mt-8 p-6 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)]">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">API Documentation</h2>
        <div className="space-y-4 text-sm text-[var(--text-secondary)]">
          <div>
            <p className="font-medium text-[var(--text-primary)] mb-1">Get all templates:</p>
            <code className="block bg-[var(--bg-surface)] rounded p-2 text-xs text-[var(--text-tertiary)] overflow-auto mb-2">
              GET /api/industry-templates
            </code>
            <p className="text-xs text-[var(--text-secondary)]">Returns all {templates.length} industry templates with full configuration.</p>
          </div>
          <div>
            <p className="font-medium text-[var(--text-primary)] mb-1">Get single template:</p>
            <code className="block bg-[var(--bg-surface)] rounded p-2 text-xs text-[var(--text-tertiary)] overflow-auto mb-2">
              GET /api/industry-templates/[slug]
            </code>
            <p className="text-xs text-[var(--text-secondary)]">
              Example: <code className="text-[var(--text-tertiary)]">/api/industry-templates/dental</code>
            </p>
          </div>
          <div className="pt-3 border-t border-[var(--border-default)]">
            <p className="text-xs text-[var(--text-secondary)]">
              These endpoints are public and require no authentication. Use them in your onboarding flow to populate agent templates by industry.
            </p>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {confirmDialog.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-surface)] rounded-lg border border-[var(--border-default)] max-w-sm w-full p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
              Apply Template?
            </h3>
            <p className="text-sm text-[var(--text-secondary)] mb-6">
              Apply <span className="font-medium text-[var(--text-primary)]">{confirmDialog.templateName}</span> to your operator? This will update your operator's greeting, knowledge base, and configuration.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() =>
                  setConfirmDialog({
                    open: false,
                    templateSlug: "",
                    templateName: "",
                  })
                }
                className="px-4 py-2 rounded-md text-sm font-medium text-[var(--text-secondary)] bg-[var(--bg-inset)] hover:bg-[var(--bg-inset)]/80 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmApplyTemplate}
                className="px-4 py-2 rounded-md text-sm font-medium text-white bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/90 transition-colors"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
