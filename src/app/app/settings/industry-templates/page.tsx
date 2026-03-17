"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { toast } from "sonner";
import { Copy, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";

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
  const t = useTranslations("common");
  const tNav = useTranslations("nav");
  const [templates, setTemplates] = useState<IndustryTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);

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
          toast.error("Failed to load industry templates");
        }
      } catch (err) {
        toast.error("Error loading templates: " + (err instanceof Error ? err.message : "Unknown error"));
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, []);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Failed to copy");
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <Breadcrumbs
          items={[
            { label: tNav("settings"), href: "/app/settings" },
            { label: "Industry Templates", href: "/app/settings/industry-templates" },
          ]}
        />
        <div className="animate-pulse">
          <div className="h-8 bg-zinc-800 rounded w-48 mb-6" />
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-32 bg-zinc-900 rounded-lg border border-zinc-800" />
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
          { label: "Industry Templates", href: "/app/settings/industry-templates" },
        ]}
      />

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Industry Templates</h1>
        <p className="text-zinc-400">
          Production-ready templates for AI agents across {templates.length} industry verticals. Use these as starter packs when creating new agents.
        </p>
      </div>

      {templates.length === 0 ? (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-8 text-center">
          <p className="text-zinc-400">No industry templates available yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {templates.map((template) => (
            <div
              key={template.industry_slug}
              className="border border-zinc-800 rounded-lg bg-zinc-900/30 overflow-hidden hover:border-zinc-700 transition-colors"
            >
              {/* Header - Always visible */}
              <button
                onClick={() =>
                  setExpandedSlug(
                    expandedSlug === template.industry_slug ? null : template.industry_slug
                  )
                }
                className="w-full p-4 flex items-start justify-between hover:bg-zinc-800/20 transition-colors"
              >
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="text-lg font-semibold text-white">{template.name}</h2>
                    <code className="text-xs px-2 py-1 rounded bg-zinc-800 text-zinc-300">
                      {template.industry_slug}
                    </code>
                  </div>
                  <p className="text-sm text-zinc-400">{template.description}</p>
                </div>
                <div className="ml-4 flex-shrink-0 text-zinc-400">
                  {expandedSlug === template.industry_slug ? (
                    <ChevronUp className="w-5 h-5" />
                  ) : (
                    <ChevronDown className="w-5 h-5" />
                  )}
                </div>
              </button>

              {/* Expanded content */}
              {expandedSlug === template.industry_slug && (
                <div className="border-t border-zinc-800 p-4 bg-zinc-900/20 space-y-6">
                  {/* Greeting */}
                  <section>
                    <h3 className="text-sm font-semibold text-white mb-2 flex items-center justify-between">
                      Default Greeting
                      <button
                        onClick={() => copyToClipboard(template.default_greeting)}
                        className="text-zinc-500 hover:text-white p-1"
                        title="Copy greeting"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </h3>
                    <p className="text-sm text-zinc-300 bg-zinc-900 rounded p-3 italic">
                      &ldquo;{template.default_greeting}&rdquo;
                    </p>
                  </section>

                  {/* Scripts */}
                  <section>
                    <h3 className="text-sm font-semibold text-white mb-3">Call Scripts ({template.default_scripts.length})</h3>
                    <div className="space-y-3">
                      {template.default_scripts.map((script, idx) => (
                        <div key={idx} className="bg-zinc-900 rounded p-3 border border-zinc-800">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="text-sm font-medium text-white">{script.name}</p>
                              <p className="text-xs text-zinc-500">Trigger: {script.trigger}</p>
                            </div>
                            <button
                              onClick={() => copyToClipboard(script.content)}
                              className="text-zinc-500 hover:text-white p-1 flex-shrink-0"
                              title="Copy script"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          </div>
                          <p className="text-xs text-zinc-300">{script.content}</p>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* FAQ */}
                  <section>
                    <h3 className="text-sm font-semibold text-white mb-3">FAQ ({template.default_faq.length} items)</h3>
                    <div className="space-y-2">
                      {template.default_faq.map((item, idx) => (
                        <div key={idx} className="bg-zinc-900 rounded p-3 border border-zinc-800">
                          <p className="text-sm font-medium text-white mb-1">{item.q}</p>
                          <p className="text-xs text-zinc-300">{item.a}</p>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Follow-up Cadence */}
                  <section>
                    <h3 className="text-sm font-semibold text-white mb-3">Follow-up Cadence ({template.default_follow_up_cadence.length} sequences)</h3>
                    <div className="space-y-3">
                      {template.default_follow_up_cadence.map((cadence, idx) => (
                        <div key={idx} className="bg-zinc-900 rounded p-3 border border-zinc-800">
                          <p className="text-sm font-medium text-white mb-2">{cadence.name}</p>
                          <div className="text-xs text-zinc-400 mb-2">
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
                                <div key={stepIdx} className="text-xs text-zinc-400">
                                  <span className="inline-block bg-zinc-800 px-2 py-0.5 rounded mr-2">
                                    {step.channel.toUpperCase()}
                                  </span>
                                  <span className="text-zinc-500">{timing}</span>
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
                    <h3 className="text-sm font-semibold text-white mb-3">Recommended Features</h3>
                    <div className="flex flex-wrap gap-2">
                      {template.recommended_features.map((feature, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-zinc-800 text-zinc-200"
                        >
                          {feature.replace(/_/g, " ")}
                        </span>
                      ))}
                    </div>
                  </section>

                  {/* API Info */}
                  <section className="pt-4 border-t border-zinc-800">
                    <h3 className="text-sm font-semibold text-white mb-3">API Access</h3>
                    <div className="bg-zinc-900 rounded p-3 border border-zinc-800 space-y-2">
                      <div>
                        <p className="text-xs text-zinc-500 mb-1">GET single template:</p>
                        <div className="flex items-center gap-2">
                          <code className="text-xs flex-1 bg-zinc-800 rounded px-2 py-1 text-zinc-300 overflow-auto">
                            /api/industry-templates/{template.industry_slug}
                          </code>
                          <button
                            onClick={() =>
                              copyToClipboard(`/api/industry-templates/${template.industry_slug}`)
                            }
                            className="text-zinc-500 hover:text-white p-1"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-zinc-500 mb-1">View in browser:</p>
                        <Link
                          href={`/api/industry-templates/${template.industry_slug}`}
                          target="_blank"
                          className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
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
      <div className="mt-8 p-6 rounded-lg border border-zinc-800 bg-zinc-900/30">
        <h2 className="text-lg font-semibold text-white mb-4">API Documentation</h2>
        <div className="space-y-4 text-sm text-zinc-300">
          <div>
            <p className="font-medium text-white mb-1">Get all templates:</p>
            <code className="block bg-zinc-900 rounded p-2 text-xs text-zinc-400 overflow-auto mb-2">
              GET /api/industry-templates
            </code>
            <p className="text-xs text-zinc-500">Returns all {templates.length} industry templates with full configuration.</p>
          </div>
          <div>
            <p className="font-medium text-white mb-1">Get single template:</p>
            <code className="block bg-zinc-900 rounded p-2 text-xs text-zinc-400 overflow-auto mb-2">
              GET /api/industry-templates/[slug]
            </code>
            <p className="text-xs text-zinc-500">
              Example: <code className="text-zinc-400">/api/industry-templates/dental</code>
            </p>
          </div>
          <div className="pt-3 border-t border-zinc-800">
            <p className="text-xs text-zinc-500">
              These endpoints are public and require no authentication. Use them in your onboarding flow to populate agent templates by industry.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
