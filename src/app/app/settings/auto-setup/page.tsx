"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ChevronDown, RefreshCw, Check, AlertCircle } from "lucide-react";
import Link from "next/link";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

interface KnowledgeStats {
  faqCount: number;
  scriptCount: number;
  objectionCount: number;
}

interface AnalysisResult {
  businessName: string;
  industry: string;
  services: string[];
  greeting: string;
  faqCount: number;
  objectionCount: number;
  faqs: Array<{ question: string; answer: string }>;
  objections: Array<{ objection: string; response: string }>;
  templates: string[];
}

interface ExpandedSections {
  greeting: boolean;
  faqs: boolean;
  objections: boolean;
  current: boolean;
}

const INDUSTRIES = [
  "Real Estate",
  "Dental",
  "Medical",
  "Legal",
  "Fitness",
  "Salon & Spa",
  "Plumbing",
  "HVAC",
  "Roofing",
  "Solar",
  "Automotive",
  "Insurance",
  "Home Services",
  "Construction",
  "Consulting",
  "Other",
];

export default function AutoSetupPage() {
  const t = useTranslations("autoSetup");
  const [url, setUrl] = useState("");
  const [industry, setIndustry] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisMessages, setAnalysisMessages] = useState<string[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [currentStats, setCurrentStats] = useState<KnowledgeStats | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [expandedSections, setExpandedSections] = useState<ExpandedSections>({
    greeting: false,
    faqs: false,
    objections: false,
    current: true,
  });
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const analyzeMessages = [
    "Reading your website...",
    "Understanding your business...",
    "Building your operator's knowledge...",
    "Creating scripts and responses...",
  ];

  // Load current stats on mount
  useEffect(() => {
    const loadCurrentStats = async () => {
      try {
        const response = await fetch("/api/workspace/knowledge-stats", { credentials: "include" });
        if (response.ok) {
          const data = await response.json();
          setCurrentStats({
            faqCount: data.faqCount || 0,
            scriptCount: data.scriptCount || 0,
            objectionCount: data.objectionCount || 0,
          });
        }
      } catch (error) {
        // silenced
      }
    };

    loadCurrentStats();
  }, []);

  const handleReanalyze = async () => {
    if (!url.trim() && !industry.trim()) {
      toast.error(t("toast.enterUrlOrIndustry"));
      return;
    }

    setAnalyzing(true);
    setAnalysisMessages([]);
    setShowPreview(true);

    const messageInterval = setInterval(() => {
      setAnalysisMessages((prev) => {
        if (prev.length < analyzeMessages.length) {
          return [...prev, analyzeMessages[prev.length]];
        }
        return prev;
      });
    }, 800);

    try {
      const response = await fetch("/api/workspace/auto-setup", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          website_url: url.trim() || undefined,
          industry: industry.trim() || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to analyze website");
      }

      const data = await response.json();
      clearInterval(messageInterval);
      setAnalysisMessages(analyzeMessages);

      setAnalysis({
        businessName: data.businessName || "Your Business",
        industry: data.industry || industry || "General",
        services: data.services || [],
        greeting: data.greeting || "Hello, this is your AI assistant speaking.",
        faqCount: data.faqCount || 0,
        objectionCount: data.objectionCount || 0,
        faqs: data.faqs || [],
        objections: data.objections || [],
        templates: data.templates || [],
      });

      if (!industry && data.industry) {
        setIndustry(data.industry);
      }
    } catch (error) {
      clearInterval(messageInterval);
      toast.error(t("toast.analyzeFailed"));
      setShowPreview(false);
    } finally {
      setAnalyzing(false);
    }
  };

  const toggleSection = (section: keyof ExpandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleConfirmAndUpdate = async () => {
    if (!analysis) return;

    setConfirming(true);
    try {
      const response = await fetch("/api/workspace/one-click-setup", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          website_url: url.trim() || undefined,
          industry: industry || analysis.industry || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update setup");
      }

      setConfirmed(true);
      toast.success(t("toast.knowledgeBaseUpdated"));

      // Reload current stats
      setTimeout(async () => {
        const statsResponse = await fetch("/api/workspace/knowledge-stats", { credentials: "include" });
        if (statsResponse.ok) {
          const data = await statsResponse.json();
          setCurrentStats({
            faqCount: data.faqCount || 0,
            scriptCount: data.scriptCount || 0,
            objectionCount: data.objectionCount || 0,
          });
        }
      }, 1000);
    } catch (error) {
      toast.error(t("toast.updateFailed"));
    } finally {
      setConfirming(false);
    }
  };

  const handleReset = () => {
    setUrl("");
    setAnalysis(null);
    setShowPreview(false);
    setAnalysisMessages([]);
    setConfirmed(false);
  };

  return (
    <div className="min-h-screen p-4 lg:p-8" style={{ backgroundColor: "var(--bg-primary)" }}>
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.5s ease-out;
        }
        .expandable-content {
          max-height: 0;
          overflow: hidden;
          transition: max-height 0.3s ease-out;
        }
        .expandable-content.expanded {
          max-height: 1000px;
        }
      `}</style>

      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8 animate-fade-in-up">
          <Breadcrumbs items={[
            { label: "Home", href: "/app" },
            { label: "Settings", href: "/app/settings" },
            { label: "Auto setup" }
          ]} />
          <h1 className="text-3xl font-bold mb-2 mt-6" style={{ color: "var(--text-primary)" }}>
            Re-analyze Your Website
          </h1>
          <p style={{ color: "var(--text-secondary)" }}>
            Update your AI operator's knowledge base with fresh website analysis.
          </p>
        </div>

        {/* Current Knowledge Base Stats */}
        {currentStats && (
          <div className="mb-8 p-6 rounded-xl border animate-fade-in-up" style={{ backgroundColor: "var(--bg-elevated)", borderColor: "var(--border-default)" }}>
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle size={20} style={{ color: "var(--accent-warning)" }} />
              <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>
                Current Knowledge Base
              </h3>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-2xl font-bold" style={{ color: "var(--accent-primary)" }}>
                  {currentStats.faqCount}
                </div>
                <p style={{ color: "var(--text-secondary)" }} className="text-sm">
                  FAQs
                </p>
              </div>
              <div>
                <div className="text-2xl font-bold" style={{ color: "var(--accent-primary)" }}>
                  {currentStats.scriptCount}
                </div>
                <p style={{ color: "var(--text-secondary)" }} className="text-sm">
                  Scripts
                </p>
              </div>
              <div>
                <div className="text-2xl font-bold" style={{ color: "var(--accent-primary)" }}>
                  {currentStats.objectionCount}
                </div>
                <p style={{ color: "var(--text-secondary)" }} className="text-sm">
                  Objection Handlers
                </p>
              </div>
            </div>

            {/* Current Data Expandable */}
            <div className="mt-4 border-t pt-4" style={{ borderColor: "var(--border-default)" }}>
              <button
                onClick={() => toggleSection("current")}
                className="w-full flex items-center justify-between text-left hover:opacity-80 transition-opacity"
              >
                <span className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>
                  Preview current knowledge base
                </span>
                <ChevronDown
                  size={18}
                  style={{ color: "var(--text-secondary)", transform: expandedSections.current ? "rotate(180deg)" : "rotate(0)" }}
                  className="transition-transform"
                />
              </button>
              <div className={`expandable-content ${expandedSections.current ? "expanded" : ""}`}>
                <div className="pt-4 space-y-2">
                  <p style={{ color: "var(--text-tertiary)" }} className="text-sm">
                    Current knowledge base will be completely replaced with new analysis. This action cannot be undone without manual recovery.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Input Section */}
        <div className="mb-8 animate-fade-in-up">
          <label htmlFor="website-url" className="block text-sm font-medium mb-3" style={{ color: "var(--text-primary)" }}>
            Website URL
          </label>
          <div className="flex gap-2">
            <input
              id="website-url"
              type="url"
              placeholder="https://yourcompany.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter" && !analyzing) {
                  handleReanalyze();
                }
              }}
              disabled={analyzing}
              className="flex-1 px-4 py-3 rounded-lg border transition-[border-color,box-shadow] focus:outline-none focus:ring-2"
              style={{
                backgroundColor: "var(--bg-surface)",
                borderColor: "var(--border-default)",
                color: "var(--text-primary)",
                "--tw-ring-color": "var(--accent-primary)",
              } as any}
            />
            <button
              onClick={handleReanalyze}
              disabled={analyzing || !url.trim()}
              className="px-6 py-3 rounded-lg font-medium transition-[background-color,border-color,color,transform] flex items-center gap-2 whitespace-nowrap"
              style={{
                backgroundColor: analyzing || !url.trim() ? "var(--border-default)" : "var(--accent-primary)",
                color: analyzing || !url.trim() ? "var(--text-secondary)" : "white",
                opacity: analyzing || !url.trim() ? 0.6 : 1,
                cursor: analyzing || !url.trim() ? "not-allowed" : "pointer",
              }}
            >
              {analyzing ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  Analyzing
                </>
              ) : (
                <>
                  <RefreshCw size={18} />
                  Re-analyze
                </>
              )}
            </button>
          </div>
        </div>

        {/* Analysis Messages */}
        {analyzing && (
          <div className="mb-8 space-y-3 animate-fade-in-up">
            {analysisMessages.map((message, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: "var(--bg-inset)" }}>
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: "var(--accent-secondary)" }}
                >
                  <Check size={14} color="white" />
                </div>
                <span style={{ color: "var(--text-secondary)" }} className="text-sm">
                  {message}
                </span>
              </div>
            ))}
            {analysisMessages.length < analyzeMessages.length && (
              <div className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: "var(--bg-inset)" }}>
                <div className="animate-spin w-5 h-5 border-2 rounded-full" style={{ borderColor: "var(--accent-primary)", borderTopColor: "transparent" }} />
                <span style={{ color: "var(--text-tertiary)" }} className="text-sm">
                  {analyzeMessages[analysisMessages.length]}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Preview Section */}
        {showPreview && !analyzing && (
          <div className="animate-fade-in-up space-y-6">
            {/* Summary */}
            {analysis && (
              <div className="p-6 rounded-xl border" style={{ backgroundColor: "var(--bg-elevated)", borderColor: "var(--border-default)" }}>
                <h3 className="font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
                  New Analysis Summary
                </h3>
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div>
                    <p style={{ color: "var(--text-tertiary)" }} className="text-xs font-medium uppercase tracking-wide mb-2">
                      Business Name
                    </p>
                    <p className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                      {analysis.businessName}
                    </p>
                  </div>
                  <div>
                    <p style={{ color: "var(--text-tertiary)" }} className="text-xs font-medium uppercase tracking-wide mb-2">
                      Industry
                    </p>
                    <select
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                      className="px-3 py-2 rounded-lg border text-sm font-medium"
                      style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-default)", color: "var(--text-primary)" }}
                    >
                      <option value="">{analysis.industry}</option>
                      {INDUSTRIES.map((ind) => (
                        <option key={ind} value={ind}>
                          {ind}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="p-4 rounded-lg" style={{ backgroundColor: "var(--bg-primary)" }}>
                    <div className="text-xl font-bold" style={{ color: "var(--accent-primary)" }}>
                      {analysis.faqCount}
                    </div>
                    <p style={{ color: "var(--text-secondary)" }} className="text-sm">
                      FAQs
                    </p>
                  </div>
                  <div className="p-4 rounded-lg" style={{ backgroundColor: "var(--bg-primary)" }}>
                    <div className="text-xl font-bold" style={{ color: "var(--accent-primary)" }}>
                      {analysis.objectionCount}
                    </div>
                    <p style={{ color: "var(--text-secondary)" }} className="text-sm">
                      Objections
                    </p>
                  </div>
                  <div className="p-4 rounded-lg" style={{ backgroundColor: "var(--bg-primary)" }}>
                    <div className="text-xl font-bold" style={{ color: "var(--accent-primary)" }}>
                      {analysis.templates.length}
                    </div>
                    <p style={{ color: "var(--text-secondary)" }} className="text-sm">
                      Templates
                    </p>
                  </div>
                </div>

                {/* Greeting */}
                <div className="p-3 rounded-lg" style={{ backgroundColor: "var(--bg-primary)" }}>
                  <p style={{ color: "var(--text-tertiary)" }} className="text-xs font-medium uppercase tracking-wide mb-2">
                    AI Greeting
                  </p>
                  <p className="italic" style={{ color: "var(--text-primary)" }}>
                    "{analysis.greeting}"
                  </p>
                </div>
              </div>
            )}

            {/* Expandable Preview Sections */}
            <div className="space-y-4">
              {/* Greeting */}
              {analysis && (
                <div className="border rounded-lg" style={{ backgroundColor: "var(--bg-elevated)", borderColor: "var(--border-default)" }}>
                  <button
                    onClick={() => toggleSection("greeting")}
                    className="w-full p-4 flex items-center justify-between text-left hover:opacity-80 transition-opacity"
                  >
                    <span className="font-medium" style={{ color: "var(--text-primary)" }}>
                      New Greeting Script
                    </span>
                    <ChevronDown
                      size={20}
                      style={{ color: "var(--text-secondary)", transform: expandedSections.greeting ? "rotate(180deg)" : "rotate(0)" }}
                      className="transition-transform"
                    />
                  </button>
                  <div className={`expandable-content ${expandedSections.greeting ? "expanded" : ""}`}>
                    <div className="px-4 pb-4 pt-0 border-t" style={{ borderColor: "var(--border-default)" }}>
                      <p className="p-3 rounded-lg" style={{ backgroundColor: "var(--bg-primary)", color: "var(--text-secondary)" }}>
                        {analysis.greeting}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* FAQs */}
              {analysis && analysis.faqs.length > 0 && (
                <div className="border rounded-lg" style={{ backgroundColor: "var(--bg-elevated)", borderColor: "var(--border-default)" }}>
                  <button
                    onClick={() => toggleSection("faqs")}
                    className="w-full p-4 flex items-center justify-between text-left hover:opacity-80 transition-opacity"
                  >
                    <span className="font-medium" style={{ color: "var(--text-primary)" }}>
                      New FAQs ({analysis.faqs.length})
                    </span>
                    <ChevronDown
                      size={20}
                      style={{ color: "var(--text-secondary)", transform: expandedSections.faqs ? "rotate(180deg)" : "rotate(0)" }}
                      className="transition-transform"
                    />
                  </button>
                  <div className={`expandable-content ${expandedSections.faqs ? "expanded" : ""}`}>
                    <div className="px-4 pb-4 pt-0 border-t space-y-4" style={{ borderColor: "var(--border-default)" }}>
                      {analysis.faqs.slice(0, 3).map((faq, idx) => (
                        <div key={idx}>
                          <p className="font-medium text-sm mb-2" style={{ color: "var(--text-primary)" }}>
                            Q: {faq.question}
                          </p>
                          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                            A: {faq.answer}
                          </p>
                        </div>
                      ))}
                      {analysis.faqs.length > 3 && (
                        <p style={{ color: "var(--text-tertiary)" }} className="text-sm italic">
                          ...and {analysis.faqs.length - 3} more
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Objections */}
              {analysis && analysis.objections.length > 0 && (
                <div className="border rounded-lg" style={{ backgroundColor: "var(--bg-elevated)", borderColor: "var(--border-default)" }}>
                  <button
                    onClick={() => toggleSection("objections")}
                    className="w-full p-4 flex items-center justify-between text-left hover:opacity-80 transition-opacity"
                  >
                    <span className="font-medium" style={{ color: "var(--text-primary)" }}>
                      New Objection Handlers ({analysis.objections.length})
                    </span>
                    <ChevronDown
                      size={20}
                      style={{ color: "var(--text-secondary)", transform: expandedSections.objections ? "rotate(180deg)" : "rotate(0)" }}
                      className="transition-transform"
                    />
                  </button>
                  <div className={`expandable-content ${expandedSections.objections ? "expanded" : ""}`}>
                    <div className="px-4 pb-4 pt-0 border-t space-y-4" style={{ borderColor: "var(--border-default)" }}>
                      {analysis.objections.slice(0, 3).map((obj, idx) => (
                        <div key={idx}>
                          <p className="font-medium text-sm mb-2" style={{ color: "var(--accent-warning)" }}>
                            Objection: {obj.objection}
                          </p>
                          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                            Response: {obj.response}
                          </p>
                        </div>
                      ))}
                      {analysis.objections.length > 3 && (
                        <p style={{ color: "var(--text-tertiary)" }} className="text-sm italic">
                          ...and {analysis.objections.length - 3} more
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Confirmation Message */}
            {!confirmed && (
              <div className="p-4 rounded-lg border" style={{ backgroundColor: "var(--accent-warning-bg)", borderColor: "var(--accent-warning)" }}>
                <p style={{ color: "var(--accent-warning)" }} className="text-sm">
                  <strong>Warning:</strong> Confirming will replace your entire current knowledge base with the new analysis. This action cannot be easily undone.
                </p>
              </div>
            )}

            {/* Success Message */}
            {confirmed && (
              <div className="p-4 rounded-lg border" style={{ backgroundColor: "var(--accent-secondary-subtle)", borderColor: "var(--accent-secondary)" }}>
                <div className="flex items-center gap-2">
                  <Check size={20} style={{ color: "var(--accent-secondary)" }} />
                  <p style={{ color: "var(--accent-secondary)" }} className="text-sm font-medium">
                    Knowledge base updated successfully!
                  </p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleReset}
                className="px-6 py-3 rounded-lg font-medium border transition-[background-color,border-color,color,transform]"
                style={{ borderColor: "var(--border-default)", color: "var(--text-primary)", backgroundColor: "var(--bg-surface)" }}
              >
                {confirmed ? "Start Over" : "Cancel"}
              </button>
              {!confirmed && (
                <button
                  onClick={handleConfirmAndUpdate}
                  disabled={confirming || !analysis}
                  className="flex-1 px-6 py-3 rounded-lg font-medium transition-[background-color,border-color,color,transform]"
                  style={{
                    backgroundColor: confirming || !analysis ? "var(--border-default)" : "var(--accent-primary)",
                    color: "white",
                    opacity: confirming || !analysis ? 0.6 : 1,
                    cursor: confirming || !analysis ? "not-allowed" : "pointer",
                  }}
                >
                  {confirming ? (
                    <>
                      <div className="inline-block animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                      Updating...
                    </>
                  ) : (
                    "Confirm & Update Knowledge Base"
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
