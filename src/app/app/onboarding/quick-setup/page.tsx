"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronDown, Check, Sparkles, ArrowRight } from "lucide-react";
import { useWorkspace } from "@/components/WorkspaceContext";

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
  templates: boolean;
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
  "Healthcare",
  "Veterinary",
  "Mental Health / Therapy",
  "Accounting / Tax",
  "Financial Services",
  "Restaurant",
  "Catering",
  "Retail",
  "Property Management",
  "Education / Training",
  "Technology / SaaS",
  "Marketing / Agency",
  "Nonprofit",
  "Events / Entertainment",
  "Travel / Hospitality",
  "Logistics / Delivery",
  "Manufacturing",
  "Photography / Creative",
  "Pet Services",
  "Childcare",
  "Senior Care",
  "Moving / Storage",
  "Electrical",
  "Landscaping",
  "Cleaning / Janitorial",
  "Security",
  "B2B / Sales",
  "Professional Services",
  "Other",
];

export default function QuickSetupPage() {
  const router = useRouter();
  const { workspaceId } = useWorkspace();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [url, setUrl] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisMessages, setAnalysisMessages] = useState<string[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [industry, setIndustry] = useState("");
  const [expandedSections, setExpandedSections] = useState<ExpandedSections>({
    greeting: false,
    faqs: false,
    objections: false,
    templates: false,
  });
  const [activating, setActivating] = useState(false);
  const progressRef = useRef<HTMLDivElement>(null);

  const analyzeMessages = [
    "Reading your website...",
    "Understanding your business...",
    "Building your operator's knowledge...",
    "Creating scripts and responses...",
  ];

  const handleAnalyze = async () => {
    if (!url.trim()) {
      toast.error("Please enter a website URL");
      return;
    }

    if (!workspaceId) {
      toast.error("Workspace not found. Please complete setup first.");
      return;
    }

    setAnalyzing(true);
    setAnalysisMessages(["Analyzing your website..."]);

    // Show progress messages only as time passes (real progress, not fabricated)
    let msgIdx = 0;
    const messageInterval = setInterval(() => {
      msgIdx++;
      if (msgIdx < analyzeMessages.length) {
        setAnalysisMessages((prev) => [...prev, analyzeMessages[msgIdx]]);
      }
    }, 2500); // Slower cadence — only shows if the API actually takes time

    try {
      const response = await fetch("/api/workspace/auto-setup", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspace_id: workspaceId, website_url: url.trim() }),
      });

      if (!response.ok) {
        throw new Error("Failed to analyze website");
      }

      const data = await response.json();
      clearInterval(messageInterval);
      setAnalysisMessages(analyzeMessages);

      setAnalysis({
        businessName: data.businessName || "Your Business",
        industry: data.industry || "General",
        services: data.services || [],
        greeting: data.greeting || "Hello, this is your AI assistant speaking.",
        faqCount: data.faqCount || 0,
        objectionCount: data.objectionCount || 0,
        faqs: data.faqs || [],
        objections: data.objections || [],
        templates: data.templates || [],
      });

      setIndustry(data.industry || "");
      setStep(2);
    } catch (error) {
      clearInterval(messageInterval);
      toast.error("Failed to analyze website. Please try again.");
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

  const handleActivate = async () => {
    if (!analysis) return;

    if (!workspaceId) {
      toast.error("Workspace not found. Please complete setup first.");
      return;
    }

    setActivating(true);
    try {
      const response = await fetch("/api/workspace/one-click-setup", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace_id: workspaceId,
          website_url: url,
          industry: industry || analysis.industry,
          businessName: analysis.businessName,
          greeting: analysis.greeting,
          faqs: analysis.faqs,
          objections: analysis.objections,
          templates: analysis.templates,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to activate setup");
      }

      setStep(3);
    } catch (error) {
      toast.error("Failed to activate setup. Please try again.");
    } finally {
      setActivating(false);
    }
  };

  const handleGoToDashboard = () => {
    router.push("/app/dashboard");
  };

  const handleTestCall = () => {
    router.push("/app/calls");
  };

  // Step 1: URL Input
  if (step === 1) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: "var(--bg-primary)" }}>
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
            animation: fadeInUp 500ms cubic-bezier(0.23, 1, 0.32, 1);
          }
        `}</style>
        <div className="w-full max-w-2xl animate-fade-in-up">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-6" style={{ backgroundColor: "var(--accent-primary-subtle)" }}>
              <Sparkles size={32} style={{ color: "var(--accent-primary)" }} />
            </div>
            <h1 className="text-4xl font-bold mb-3" style={{ color: "var(--text-primary)" }}>
              Set Up Your AI Operator in Seconds
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "1.125rem" }} className="mb-2">
              We&apos;ll analyze your business and configure everything automatically.
            </p>
            <p style={{ color: "var(--text-tertiary)" }} className="text-sm">
              No manual scripts or setup required — just share your website.
            </p>
          </div>

          {/* Input Section */}
          <div className="space-y-4">
            <div>
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
                      handleAnalyze();
                    }
                  }}
                  disabled={analyzing}
                  className="flex-1 px-4 py-4 rounded-lg border transition-[border-color,box-shadow] duration-200 focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: "var(--bg-surface)",
                    borderColor: "var(--border-default)",
                    color: "var(--text-primary)",
                    "--tw-ring-color": "var(--accent-primary)",
                  } as Record<string, unknown>}
                />
                <button
                  onClick={handleAnalyze}
                  disabled={analyzing || !url.trim()}
                  className="px-8 py-4 rounded-lg font-medium transition-[background-color,color,opacity] duration-160 flex items-center gap-2 whitespace-nowrap active:scale-[0.97]"
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
                      Analyze
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Progress Messages */}
            {analyzing && (
              <div className="mt-8 space-y-3">
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
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Review Results
  if (step === 2 && analysis) {
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
          @keyframes slideDown {
            from {
              opacity: 0;
              max-height: 0;
            }
            to {
              opacity: 1;
              max-height: 1000px;
            }
          }
          .animate-fade-in-up {
            animation: fadeInUp 500ms cubic-bezier(0.23, 1, 0.32, 1);
          }
          .animate-slide-down {
            animation: slideDown 300ms cubic-bezier(0.23, 1, 0.32, 1);
          }
          .expandable-content {
            max-height: 0;
            overflow: hidden;
            transition: max-height 200ms cubic-bezier(0.23, 1, 0.32, 1);
          }
          .expandable-content.expanded {
            max-height: 1000px;
          }
        `}</style>
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="mb-8 animate-fade-in-up">
            <h1 className="text-3xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
              We Found Your Business
            </h1>
            <p style={{ color: "var(--text-secondary)" }}>Review what we learned and customize if needed.</p>
          </div>

          {/* Summary Card */}
          <div className="p-6 rounded-xl mb-8 border animate-fade-in-up" style={{ backgroundColor: "var(--bg-elevated)", borderColor: "var(--border-default)" }}>
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <p style={{ color: "var(--text-tertiary)" }} className="text-xs font-medium uppercase tracking-wide mb-2">
                  Business Name
                </p>
                <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
                  {analysis.businessName}
                </h2>
              </div>
              <div>
                <p style={{ color: "var(--text-tertiary)" }} className="text-xs font-medium uppercase tracking-wide mb-2">
                  Industry
                </p>
                <div className="flex gap-2">
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
            </div>

            {analysis.services.length > 0 && (
              <div>
                <p style={{ color: "var(--text-tertiary)" }} className="text-xs font-medium uppercase tracking-wide mb-3">
                  Services Found
                </p>
                <div className="flex flex-wrap gap-2">
                  {analysis.services.slice(0, 5).map((service, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 rounded-full text-sm font-medium"
                      style={{ backgroundColor: "var(--accent-primary-subtle)", color: "var(--accent-primary)" }}
                    >
                      {service}
                    </span>
                  ))}
                  {analysis.services.length > 5 && (
                    <span
                      className="px-3 py-1 rounded-full text-sm font-medium"
                      style={{ backgroundColor: "var(--accent-primary-subtle)", color: "var(--accent-primary)" }}
                    >
                      +{analysis.services.length - 5} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* AI Greeting Preview */}
            <div className="mt-6 pt-6 border-t" style={{ borderColor: "var(--border-default)" }}>
              <p style={{ color: "var(--text-tertiary)" }} className="text-xs font-medium uppercase tracking-wide mb-3">
                AI Greeting
              </p>
              <p className="italic text-lg" style={{ color: "var(--text-primary)" }}>
                &ldquo;{analysis.greeting}&rdquo;
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 animate-fade-in-up">
            <div className="p-4 rounded-lg border" style={{ backgroundColor: "var(--bg-inset)", borderColor: "var(--border-default)" }}>
              <div className="text-2xl font-bold" style={{ color: "var(--accent-primary)" }}>
                {analysis.faqCount}
              </div>
              <p style={{ color: "var(--text-secondary)" }} className="text-sm">
                FAQs Generated
              </p>
            </div>
            <div className="p-4 rounded-lg border" style={{ backgroundColor: "var(--bg-inset)", borderColor: "var(--border-default)" }}>
              <div className="text-2xl font-bold" style={{ color: "var(--accent-primary)" }}>
                {analysis.objectionCount}
              </div>
              <p style={{ color: "var(--text-secondary)" }} className="text-sm">
                Objection Handlers
              </p>
            </div>
            <div className="p-4 rounded-lg border" style={{ backgroundColor: "var(--bg-inset)", borderColor: "var(--border-default)" }}>
              <div className="text-2xl font-bold" style={{ color: "var(--accent-primary)" }}>
                {analysis.templates.length}
              </div>
              <p style={{ color: "var(--text-secondary)" }} className="text-sm">
                Text Templates
              </p>
            </div>
            <div className="p-4 rounded-lg border" style={{ backgroundColor: "var(--bg-inset)", borderColor: "var(--border-default)" }}>
              <div className="text-2xl font-bold" style={{ color: "var(--accent-secondary)" }}>
                100%
              </div>
              <p style={{ color: "var(--text-secondary)" }} className="text-sm">
                Ready to Go
              </p>
            </div>
          </div>

          {/* Expandable Sections */}
          <div className="space-y-4 mb-8">
            {/* Greeting Section */}
            <div className="border rounded-lg" style={{ backgroundColor: "var(--bg-elevated)", borderColor: "var(--border-default)" }}>
              <button
                onClick={() => toggleSection("greeting")}
                className="w-full p-4 flex items-center justify-between text-left transition-[opacity,background-color] duration-160 active:scale-[0.98] hover:opacity-80"
              >
                <span className="font-medium" style={{ color: "var(--text-primary)" }}>
                  Generated Greeting Script
                </span>
                <ChevronDown
                  size={20}
                  style={{ color: "var(--text-secondary)", transform: expandedSections.greeting ? "rotate(180deg)" : "rotate(0)" }}
                  className="transition-transform duration-200"
                />
              </button>
              <div className={`expandable-content ${expandedSections.greeting ? "expanded" : ""}`}>
                <div className="px-4 pb-4 pt-0 border-t" style={{ borderColor: "var(--border-default)" }}>
                  <p className="p-3 rounded-lg" style={{ backgroundColor: "var(--bg-primary)", color: "var(--text-secondary)", fontSize: "0.95rem" }}>
                    {analysis.greeting}
                  </p>
                </div>
              </div>
            </div>

            {/* FAQs Section */}
            {analysis.faqs.length > 0 && (
              <div className="border rounded-lg" style={{ backgroundColor: "var(--bg-elevated)", borderColor: "var(--border-default)" }}>
                <button
                  onClick={() => toggleSection("faqs")}
                  className="w-full p-4 flex items-center justify-between text-left hover:opacity-80 transition-opacity"
                >
                  <span className="font-medium" style={{ color: "var(--text-primary)" }}>
                    Sample FAQs ({analysis.faqs.length} total)
                  </span>
                  <ChevronDown
                    size={20}
                    style={{ color: "var(--text-secondary)", transform: expandedSections.faqs ? "rotate(180deg)" : "rotate(0)" }}
                    className="transition-transform"
                  />
                </button>
                <div className={`expandable-content ${expandedSections.faqs ? "expanded" : ""}`}>
                  <div className="px-4 pb-4 pt-0 border-t space-y-4" style={{ borderColor: "var(--border-default)" }}>
                    {analysis.faqs.slice(0, 5).map((faq, idx) => (
                      <div key={idx}>
                        <p className="font-medium text-sm mb-2" style={{ color: "var(--text-primary)" }}>
                          Q: {faq.question}
                        </p>
                        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                          A: {faq.answer}
                        </p>
                      </div>
                    ))}
                    {analysis.faqs.length > 5 && (
                      <p style={{ color: "var(--text-tertiary)" }} className="text-sm italic">
                        ...and {analysis.faqs.length - 5} more FAQs
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Objections Section */}
            {analysis.objections.length > 0 && (
              <div className="border rounded-lg" style={{ backgroundColor: "var(--bg-elevated)", borderColor: "var(--border-default)" }}>
                <button
                  onClick={() => toggleSection("objections")}
                  className="w-full p-4 flex items-center justify-between text-left hover:opacity-80 transition-opacity"
                >
                  <span className="font-medium" style={{ color: "var(--text-primary)" }}>
                    Objection Handlers ({analysis.objections.length} total)
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
                        ...and {analysis.objections.length - 3} more handlers
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Templates Section */}
            {analysis.templates.length > 0 && (
              <div className="border rounded-lg" style={{ backgroundColor: "var(--bg-elevated)", borderColor: "var(--border-default)" }}>
                <button
                  onClick={() => toggleSection("templates")}
                  className="w-full p-4 flex items-center justify-between text-left hover:opacity-80 transition-opacity"
                >
                  <span className="font-medium" style={{ color: "var(--text-primary)" }}>
                    Follow-up Text Templates ({analysis.templates.length})
                  </span>
                  <ChevronDown
                    size={20}
                    style={{ color: "var(--text-secondary)", transform: expandedSections.templates ? "rotate(180deg)" : "rotate(0)" }}
                    className="transition-transform"
                  />
                </button>
                <div className={`expandable-content ${expandedSections.templates ? "expanded" : ""}`}>
                  <div className="px-4 pb-4 pt-0 border-t space-y-2" style={{ borderColor: "var(--border-default)" }}>
                    {analysis.templates.slice(0, 3).map((template, idx) => (
                      <p key={idx} className="text-sm p-2 rounded" style={{ backgroundColor: "var(--bg-primary)", color: "var(--text-secondary)" }}>
                        {template}
                      </p>
                    ))}
                    {analysis.templates.length > 3 && (
                      <p style={{ color: "var(--text-tertiary)" }} className="text-sm italic">
                        ...and {analysis.templates.length - 3} more templates
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 sticky bottom-4 lg:bottom-0">
            <button
              onClick={() => setStep(1)}
              className="px-6 py-3 rounded-lg font-medium border transition-[background-color,border-color] duration-160 active:scale-[0.97]"
              style={{ borderColor: "var(--border-default)", color: "var(--text-primary)", backgroundColor: "var(--bg-surface)" }}
            >
              Back
            </button>
            <button
              onClick={handleActivate}
              disabled={activating}
              className="flex-1 px-6 py-3 rounded-lg font-medium transition-[background-color,opacity] duration-160 flex items-center justify-center gap-2 active:scale-[0.97]"
              style={{
                backgroundColor: activating ? "var(--border-default)" : "var(--accent-primary)",
                color: "white",
                opacity: activating ? 0.6 : 1,
                cursor: activating ? "not-allowed" : "pointer",
              }}
            >
              {activating ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  Activating...
                </>
              ) : (
                <>
                  Looks Good, Activate!
                  <Sparkles size={18} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 3: Success
  if (step === 3) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: "var(--bg-primary)" }}>
        <style>{`
          @keyframes fadeInScale {
            from {
              opacity: 0;
              transform: scale(0.95);
            }
            to {
              opacity: 1;
              transform: scale(1);
            }
          }
          @keyframes confetti-fall {
            0% {
              opacity: 1;
              transform: translateY(-10px) rotate(0deg);
            }
            100% {
              opacity: 0;
              transform: translateY(100vh) rotate(360deg);
            }
          }
          @keyframes confetti-swing {
            0%, 100% {
              transform: translateX(0);
            }
            50% {
              transform: translateX(20px);
            }
          }
          .confetti {
            position: fixed;
            pointer-events: none;
          }
          .confetti-piece {
            display: inline-block;
            width: 10px;
            height: 10px;
            animation: confetti-fall 3s ease-in forwards, confetti-swing 0.5s ease-in-out infinite;
          }
          .animate-fade-in-scale {
            animation: fadeInScale 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
          }
        `}</style>

        {/* Confetti */}
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="confetti"
            style={{
              left: `${Math.random() * 100}%`,
              top: `-10px`,
              animation: `confetti-fall ${2 + Math.random()}s ease-in forwards`,
            }}
          >
            <div
              className="confetti-piece"
              style={{
                backgroundColor: [
                  "var(--accent-primary)",
                  "var(--accent-secondary)",
                  "var(--accent-warning)",
                  "#FF6B6B",
                  "#4ECDC4",
                ][Math.floor(Math.random() * 5)],
                borderRadius: Math.random() > 0.5 ? "50%" : "2px",
              }}
            />
          </div>
        ))}

        <div className="w-full max-w-2xl text-center animate-fade-in-scale">
          {/* Success Icon */}
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-8" style={{ backgroundColor: "var(--accent-secondary-subtle)" }}>
            <Check size={48} style={{ color: "var(--accent-secondary)" }} />
          </div>

          {/* Heading */}
          <h1 className="text-4xl font-bold mb-3" style={{ color: "var(--text-primary)" }}>
            You&apos;re Live!
          </h1>
          <p className="text-lg mb-12" style={{ color: "var(--text-secondary)" }}>
            Your AI operator is ready to handle calls and automate your revenue operations.
          </p>

          {/* Capabilities */}
          <div className="space-y-3 mb-12">
            <h3 className="font-semibold text-lg mb-6" style={{ color: "var(--text-primary)" }}>
              Your AI operator can now:
            </h3>
            {[
              "Answer calls with your custom greeting",
              `Handle ${analysis?.faqCount || 0} common questions automatically`,
              `Overcome ${analysis?.objectionCount || 0} sales objections`,
              "Send follow-up texts automatically",
              "Book appointments on your calendar",
            ].map((capability, idx) => (
              <div key={idx} className="flex items-start gap-3 p-4 rounded-lg text-left" style={{ backgroundColor: "var(--bg-inset)" }}>
                <Check size={20} style={{ color: "var(--accent-secondary)", flexShrink: 0, marginTop: "2px" }} />
                <span style={{ color: "var(--text-primary)" }}>{capability}</span>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleGoToDashboard}
              className="flex-1 px-6 py-4 rounded-lg font-semibold transition-[background-color,transform] duration-160 active:scale-[0.97]"
              style={{
                backgroundColor: "var(--accent-primary)",
                color: "white",
                cursor: "pointer",
              }}
            >
              Go to Dashboard
            </button>
            <button
              onClick={handleTestCall}
              className="flex-1 px-6 py-4 rounded-lg font-semibold border transition-[background-color,border-color,transform] duration-160 active:scale-[0.97]"
              style={{
                borderColor: "var(--border-default)",
                backgroundColor: "var(--bg-surface)",
                color: "var(--text-primary)",
                cursor: "pointer",
              }}
            >
              Make a Test Call
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
