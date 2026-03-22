"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ChevronDown, ArrowRight, Check } from "lucide-react";
import Link from "next/link";

type SetupStep = "method" | "context" | "loading" | "preview";

interface SetupInput {
  website_url?: string;
  business_description?: string;
  industry?: string;
  product_or_service?: string;
  target_audience?: string;
  price_range?: string;
  selling_for?: string;
  use_case?: string;
  tone?: string;
  additional_context?: string;
}

interface GeneratedIntelligence {
  agentGreetingScript: string;
  faqPairs: Array<{ question: string; answer: string }>;
  objectionHandlers: Array<{ objection: string; handler: string }>;
  followUpTexts: string[];
  followUpEmails: string[];
  keyPhrases: string[];
  qualifyingQuestions: string[];
}

const INDUSTRIES = [
  "Real Estate",
  "Insurance",
  "Solar",
  "Home Services",
  "Dental/Medical",
  "Legal",
  "Financial Services",
  "SaaS/Tech",
  "Consulting",
  "Automotive",
  "Fitness/Wellness",
  "E-commerce",
  "Construction",
  "Roofing",
  "HVAC",
  "Landscaping",
];

const USE_CASES = [
  { value: "appointment_setting", label: "Book Appointments" },
  { value: "lead_qualification", label: "Qualify Leads" },
  { value: "sales_closing", label: "Close Sales" },
  { value: "customer_support", label: "Customer Support" },
  { value: "follow_up", label: "Follow Up" },
  { value: "reactivation", label: "Reactivate Cold Leads" },
  { value: "all", label: "All of the Above" },
];

const TONES = [
  { value: "friendly", label: "Friendly & Warm" },
  { value: "professional", label: "Professional" },
  { value: "consultative", label: "Consultative" },
  { value: "direct_confident", label: "Direct & Confident" },
  { value: "casual", label: "Casual" },
];

const LOADING_MESSAGES = [
  "Understanding your business...",
  "Building your sales playbook...",
  "Creating objection handlers...",
  "Generating follow-up sequences...",
  "Configuring your AI agent...",
  "Done! Your agent is ready.",
];

export default function SmartSetupPage() {
  const [step, setStep] = useState<SetupStep>("method");
  const [setupInput, setSetupInput] = useState<SetupInput>({});
  const [loadingMessages, setLoadingMessages] = useState<string[]>([]);
  const [generatedIntelligence, setGeneratedIntelligence] =
    useState<GeneratedIntelligence | null>(null);
  const [expandedSections, setExpandedSections] = useState({
    greeting: true,
    faqs: false,
    objections: false,
  });
  const [isActivating, setIsActivating] = useState(false);

  const handleMethodSelect = (method: "website" | "description" | "client") => {
    if (method === "website") {
      setSetupInput({ website_url: "" });
    } else if (method === "description") {
      setSetupInput({ business_description: "" });
    } else {
      setSetupInput({ selling_for: "", business_description: "" });
    }
    setStep("context");
  };

  const handleContextInputChange = (
    field: keyof SetupInput,
    value: string
  ) => {
    setSetupInput((prev) => ({ ...prev, [field]: value }));
  };

  const handleChipSelect = (
    field: keyof SetupInput,
    value: string,
    isToggle = false
  ) => {
    setSetupInput((prev) => {
      if (isToggle && prev[field] === value) {
        return { ...prev, [field]: undefined };
      }
      return { ...prev, [field]: value };
    });
  };

  const canProceedToLoading = () => {
    return (
      setupInput.website_url ||
      setupInput.business_description ||
      setupInput.industry ||
      setupInput.product_or_service
    );
  };

  const handleProceedToLoading = async () => {
    if (!canProceedToLoading()) {
      toast.error("Please provide at least some information about your business");
      return;
    }

    setStep("loading");
    setLoadingMessages([]);

    let messageIndex = 0;
    const messageInterval = setInterval(() => {
      if (messageIndex < LOADING_MESSAGES.length) {
        setLoadingMessages((prev) => [...prev, LOADING_MESSAGES[messageIndex]]);
        messageIndex++;
      } else {
        clearInterval(messageInterval);
      }
    }, 1500);

    try {
      const response = await fetch("/api/workspace/auto-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(setupInput),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate agent setup");
      }

      const data = await response.json();
      clearInterval(messageInterval);
      setLoadingMessages(LOADING_MESSAGES);

      setGeneratedIntelligence(data.generatedIntelligence || data.intelligence);
      setStep("preview");
    } catch (error) {
      clearInterval(messageInterval);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to generate setup";
      toast.error(errorMessage);
      setStep("context");
    }
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleActivateAgent = async () => {
    setIsActivating(true);
    try {
      // The one-click-setup endpoint already saved everything
      toast.success("Your AI agent is ready to make calls!");
      // Redirect after brief delay
      setTimeout(() => {
        window.location.href = "/app/agents";
      }, 1500);
    } catch (error) {
      toast.error("Failed to activate agent");
      setIsActivating(false);
    }
  };

  return (
    <div
      className="min-h-screen p-4 lg:p-8"
      style={{ backgroundColor: "var(--bg-primary)" }}
    >
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
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin 3s linear infinite;
        }
        .expandable-content {
          max-height: 0;
          overflow: hidden;
          transition: max-height 0.3s ease-out;
        }
        .expandable-content.expanded {
          max-height: 2000px;
        }
      `}</style>

      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-12 animate-fade-in-up text-center">
          <h1
            className="text-4xl font-bold mb-3"
            style={{ color: "var(--text-primary)" }}
          >
            {step === "method"
              ? "Let's set up your AI agent"
              : step === "context"
              ? "Tell us about your business"
              : step === "loading"
              ? "Building your agent..."
              : "Almost there!"}
          </h1>
          <p style={{ color: "var(--text-secondary)" }} className="text-lg">
            {step === "method"
              ? "Choose how you'd like to set up your AI sales agent"
              : step === "context"
              ? "The more details you provide, the better your agent will perform"
              : step === "loading"
              ? "This usually takes 1-2 minutes"
              : "Review and activate your agent"}
          </p>
        </div>

        {/* STEP 1: Choose Setup Method */}
        {step === "method" && (
          <div className="space-y-4 animate-fade-in-up">
            <button
              onClick={() => handleMethodSelect("website")}
              className="w-full p-6 rounded-2xl border-2 transition-all text-left group hover:border-current"
              style={{
                backgroundColor: "var(--bg-surface)",
                borderColor: "var(--border-default)",
              }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3
                    className="font-semibold text-lg mb-2"
                    style={{ color: "var(--text-primary)" }}
                  >
                    I have a website
                  </h3>
                  <p style={{ color: "var(--text-secondary)" }} className="text-sm">
                    We'll analyze your site to set up the perfect playbook
                  </p>
                </div>
                <ArrowRight
                  size={20}
                  style={{ color: "var(--text-secondary)" }}
                  className="group-hover:translate-x-1 transition-transform"
                />
              </div>
            </button>

            <button
              onClick={() => handleMethodSelect("description")}
              className="w-full p-6 rounded-2xl border-2 transition-all text-left group hover:border-current"
              style={{
                backgroundColor: "var(--bg-surface)",
                borderColor: "var(--border-default)",
              }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3
                    className="font-semibold text-lg mb-2"
                    style={{ color: "var(--text-primary)" }}
                  >
                    I'll describe my business
                  </h3>
                  <p style={{ color: "var(--text-secondary)" }} className="text-sm">
                    Tell us what you do and we'll build everything from scratch
                  </p>
                </div>
                <ArrowRight
                  size={20}
                  style={{ color: "var(--text-secondary)" }}
                  className="group-hover:translate-x-1 transition-transform"
                />
              </div>
            </button>

            <button
              onClick={() => handleMethodSelect("client")}
              className="w-full p-6 rounded-2xl border-2 transition-all text-left group hover:border-current"
              style={{
                backgroundColor: "var(--bg-surface)",
                borderColor: "var(--border-default)",
              }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3
                    className="font-semibold text-lg mb-2"
                    style={{ color: "var(--text-primary)" }}
                  >
                    I'm setting up for a client
                  </h3>
                  <p style={{ color: "var(--text-secondary)" }} className="text-sm">
                    Set up an agent for a client business (agency, contractor, etc)
                  </p>
                </div>
                <ArrowRight
                  size={20}
                  style={{ color: "var(--text-secondary)" }}
                  className="group-hover:translate-x-1 transition-transform"
                />
              </div>
            </button>
          </div>
        )}

        {/* STEP 2: Gather Context */}
        {step === "context" && (
          <div className="space-y-8 animate-fade-in-up">
            {/* Website URL Input */}
            {setupInput.website_url !== undefined && (
              <div>
                <label
                  htmlFor="website-url"
                  className="block text-sm font-medium mb-3"
                  style={{ color: "var(--text-primary)" }}
                >
                  Website URL
                </label>
                <input
                  id="website-url"
                  type="url"
                  placeholder="https://yourcompany.com"
                  value={setupInput.website_url}
                  onChange={(e) =>
                    handleContextInputChange("website_url", e.target.value)
                  }
                  className="w-full px-4 py-3 rounded-lg border transition-all focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: "var(--bg-surface)",
                    borderColor: "var(--border-default)",
                    color: "var(--text-primary)",
                    "--tw-ring-color": "var(--accent-primary)",
                  } as any}
                />
              </div>
            )}

            {/* Selling For */}
            {setupInput.selling_for !== undefined && (
              <div>
                <label
                  htmlFor="selling-for"
                  className="block text-sm font-medium mb-3"
                  style={{ color: "var(--text-primary)" }}
                >
                  Client Name
                </label>
                <input
                  id="selling-for"
                  type="text"
                  placeholder="e.g., SunPower Solar, ABC Real Estate"
                  value={setupInput.selling_for}
                  onChange={(e) =>
                    handleContextInputChange("selling_for", e.target.value)
                  }
                  className="w-full px-4 py-3 rounded-lg border transition-all focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: "var(--bg-surface)",
                    borderColor: "var(--border-default)",
                    color: "var(--text-primary)",
                    "--tw-ring-color": "var(--accent-primary)",
                  } as any}
                />
              </div>
            )}

            {/* Business Description */}
            {setupInput.business_description !== undefined && (
              <div>
                <label
                  htmlFor="business-desc"
                  className="block text-sm font-medium mb-3"
                  style={{ color: "var(--text-primary)" }}
                >
                  What do you do?
                </label>
                <textarea
                  id="business-desc"
                  placeholder="e.g., We sell premium solar panels door-to-door to homeowners in California. We focus on high-ticket installations ($15k-$30k)."
                  value={setupInput.business_description}
                  onChange={(e) =>
                    handleContextInputChange("business_description", e.target.value)
                  }
                  className="w-full px-4 py-3 rounded-lg border transition-all focus:outline-none focus:ring-2 min-h-24"
                  style={{
                    backgroundColor: "var(--bg-surface)",
                    borderColor: "var(--border-default)",
                    color: "var(--text-primary)",
                    "--tw-ring-color": "var(--accent-primary)",
                  } as any}
                />
              </div>
            )}

            {/* Industry */}
            <div>
              <label
                className="block text-sm font-medium mb-3"
                style={{ color: "var(--text-primary)" }}
              >
                Industry (optional)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {INDUSTRIES.map((ind) => (
                  <button
                    key={ind}
                    onClick={() => handleChipSelect("industry", ind, true)}
                    className="px-3 py-2 rounded-lg text-sm font-medium transition-all border"
                    style={{
                      backgroundColor:
                        setupInput.industry === ind
                          ? "var(--accent-primary)"
                          : "var(--bg-surface)",
                      borderColor:
                        setupInput.industry === ind
                          ? "var(--accent-primary)"
                          : "var(--border-default)",
                      color:
                        setupInput.industry === ind
                          ? "white"
                          : "var(--text-primary)",
                    }}
                  >
                    {ind}
                  </button>
                ))}
              </div>
            </div>

            {/* Product/Service */}
            {!setupInput.website_url && (
              <div>
                <label
                  htmlFor="product"
                  className="block text-sm font-medium mb-3"
                  style={{ color: "var(--text-primary)" }}
                >
                  Product or Service (optional)
                </label>
                <input
                  id="product"
                  type="text"
                  placeholder="e.g., Home solar panel installation"
                  value={setupInput.product_or_service || ""}
                  onChange={(e) =>
                    handleContextInputChange("product_or_service", e.target.value)
                  }
                  className="w-full px-4 py-3 rounded-lg border transition-all focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: "var(--bg-surface)",
                    borderColor: "var(--border-default)",
                    color: "var(--text-primary)",
                    "--tw-ring-color": "var(--accent-primary)",
                  } as any}
                />
              </div>
            )}

            {/* Use Case */}
            <div>
              <label
                className="block text-sm font-medium mb-3"
                style={{ color: "var(--text-primary)" }}
              >
                What's the primary use? (optional)
              </label>
              <div className="space-y-2">
                {USE_CASES.map((uc) => (
                  <button
                    key={uc.value}
                    onClick={() => handleChipSelect("use_case", uc.value, true)}
                    className="w-full px-4 py-2 rounded-lg text-sm font-medium transition-all border text-left"
                    style={{
                      backgroundColor:
                        setupInput.use_case === uc.value
                          ? "var(--accent-primary)"
                          : "var(--bg-surface)",
                      borderColor:
                        setupInput.use_case === uc.value
                          ? "var(--accent-primary)"
                          : "var(--border-default)",
                      color:
                        setupInput.use_case === uc.value
                          ? "white"
                          : "var(--text-primary)",
                    }}
                  >
                    {uc.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tone */}
            <div>
              <label
                className="block text-sm font-medium mb-3"
                style={{ color: "var(--text-primary)" }}
              >
                Agent Tone (optional)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {TONES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => handleChipSelect("tone", t.value, true)}
                    className="px-3 py-2 rounded-lg text-sm font-medium transition-all border"
                    style={{
                      backgroundColor:
                        setupInput.tone === t.value
                          ? "var(--accent-primary)"
                          : "var(--bg-surface)",
                      borderColor:
                        setupInput.tone === t.value
                          ? "var(--accent-primary)"
                          : "var(--border-default)",
                      color:
                        setupInput.tone === t.value
                          ? "white"
                          : "var(--text-primary)",
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Additional Context */}
            <div>
              <label
                htmlFor="additional"
                className="block text-sm font-medium mb-3"
                style={{ color: "var(--text-primary)" }}
              >
                Anything else? (optional)
              </label>
              <textarea
                id="additional"
                placeholder="e.g., We work with home builders, unique selling point is our 25-year warranty..."
                value={setupInput.additional_context || ""}
                onChange={(e) =>
                  handleContextInputChange("additional_context", e.target.value)
                }
                className="w-full px-4 py-3 rounded-lg border transition-all focus:outline-none focus:ring-2 min-h-20"
                style={{
                  backgroundColor: "var(--bg-surface)",
                  borderColor: "var(--border-default)",
                  color: "var(--text-primary)",
                  "--tw-ring-color": "var(--accent-primary)",
                } as any}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => {
                  setStep("method");
                  setSetupInput({});
                }}
                className="px-6 py-3 rounded-lg font-medium border transition-all"
                style={{
                  borderColor: "var(--border-default)",
                  color: "var(--text-primary)",
                  backgroundColor: "var(--bg-surface)",
                }}
              >
                Back
              </button>
              <button
                onClick={handleProceedToLoading}
                disabled={!canProceedToLoading()}
                className="flex-1 px-6 py-3 rounded-lg font-medium transition-all"
                style={{
                  backgroundColor: canProceedToLoading()
                    ? "var(--accent-primary)"
                    : "var(--border-default)",
                  color: "white",
                  opacity: canProceedToLoading() ? 1 : 0.5,
                  cursor: canProceedToLoading() ? "pointer" : "not-allowed",
                }}
              >
                Build My Agent
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Loading */}
        {step === "loading" && (
          <div className="animate-fade-in-up text-center space-y-8">
            <div
              className="w-24 h-24 mx-auto rounded-full flex items-center justify-center animate-spin-slow"
              style={{
                backgroundColor: "var(--bg-surface)",
              }}
            >
              <div
                className="w-20 h-20 rounded-full"
                style={{
                  background: "conic-gradient(var(--accent-primary), var(--border-default))",
                }}
              />
            </div>

            <div className="space-y-3">
              {loadingMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-3 rounded-lg"
                  style={{ backgroundColor: "var(--bg-surface)" }}
                >
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: "var(--accent-secondary)" }}
                  >
                    <Check size={14} color="white" />
                  </div>
                  <span
                    style={{ color: "var(--text-secondary)" }}
                    className="text-sm"
                  >
                    {msg}
                  </span>
                </div>
              ))}
              {loadingMessages.length < LOADING_MESSAGES.length && (
                <div className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: "var(--bg-surface)" }}>
                  <div
                    className="animate-spin w-5 h-5 border-2 rounded-full"
                    style={{
                      borderColor: "var(--accent-primary)",
                      borderTopColor: "transparent",
                    }}
                  />
                  <span
                    style={{ color: "var(--text-tertiary)" }}
                    className="text-sm"
                  >
                    {LOADING_MESSAGES[loadingMessages.length]}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 4: Preview */}
        {step === "preview" && generatedIntelligence && (
          <div className="space-y-6 animate-fade-in-up">
            {/* Greeting Preview */}
            <div
              className="p-6 rounded-2xl border"
              style={{
                backgroundColor: "var(--bg-surface)",
                borderColor: "var(--border-default)",
              }}
            >
              <button
                onClick={() => toggleSection("greeting")}
                className="w-full flex items-center justify-between text-left hover:opacity-80 transition-opacity"
              >
                <h3
                  className="font-semibold text-lg"
                  style={{ color: "var(--text-primary)" }}
                >
                  Agent Greeting
                </h3>
                <ChevronDown
                  size={20}
                  style={{
                    color: "var(--text-secondary)",
                    transform: expandedSections.greeting
                      ? "rotate(180deg)"
                      : "rotate(0)",
                  }}
                  className="transition-transform"
                />
              </button>
              <div
                className={`expandable-content ${
                  expandedSections.greeting ? "expanded" : ""
                }`}
              >
                <p
                  className="mt-4 p-4 rounded-lg italic"
                  style={{
                    backgroundColor: "var(--bg-primary)",
                    color: "var(--text-secondary)",
                  }}
                >
                  "{generatedIntelligence.agentGreetingScript}"
                </p>
              </div>
            </div>

            {/* FAQs Preview */}
            {generatedIntelligence.faqPairs.length > 0 && (
              <div
                className="p-6 rounded-2xl border"
                style={{
                  backgroundColor: "var(--bg-surface)",
                  borderColor: "var(--border-default)",
                }}
              >
                <button
                  onClick={() => toggleSection("faqs")}
                  className="w-full flex items-center justify-between text-left hover:opacity-80 transition-opacity"
                >
                  <h3
                    className="font-semibold text-lg"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Sample FAQs ({generatedIntelligence.faqPairs.length})
                  </h3>
                  <ChevronDown
                    size={20}
                    style={{
                      color: "var(--text-secondary)",
                      transform: expandedSections.faqs
                        ? "rotate(180deg)"
                        : "rotate(0)",
                    }}
                    className="transition-transform"
                  />
                </button>
                <div
                  className={`expandable-content ${
                    expandedSections.faqs ? "expanded" : ""
                  }`}
                >
                  <div className="mt-4 space-y-4 border-t pt-4" style={{ borderColor: "var(--border-default)" }}>
                    {generatedIntelligence.faqPairs.slice(0, 2).map((faq, idx) => (
                      <div key={idx}>
                        <p
                          className="font-medium text-sm mb-2"
                          style={{ color: "var(--text-primary)" }}
                        >
                          Q: {faq.question}
                        </p>
                        <p
                          className="text-sm"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          A: {faq.answer}
                        </p>
                      </div>
                    ))}
                    {generatedIntelligence.faqPairs.length > 2 && (
                      <p
                        style={{ color: "var(--text-tertiary)" }}
                        className="text-sm italic pt-2"
                      >
                        ...and {generatedIntelligence.faqPairs.length - 2} more
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Objections Preview */}
            {generatedIntelligence.objectionHandlers.length > 0 && (
              <div
                className="p-6 rounded-2xl border"
                style={{
                  backgroundColor: "var(--bg-surface)",
                  borderColor: "var(--border-default)",
                }}
              >
                <button
                  onClick={() => toggleSection("objections")}
                  className="w-full flex items-center justify-between text-left hover:opacity-80 transition-opacity"
                >
                  <h3
                    className="font-semibold text-lg"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Objection Handlers ({generatedIntelligence.objectionHandlers.length})
                  </h3>
                  <ChevronDown
                    size={20}
                    style={{
                      color: "var(--text-secondary)",
                      transform: expandedSections.objections
                        ? "rotate(180deg)"
                        : "rotate(0)",
                    }}
                    className="transition-transform"
                  />
                </button>
                <div
                  className={`expandable-content ${
                    expandedSections.objections ? "expanded" : ""
                  }`}
                >
                  <div className="mt-4 space-y-4 border-t pt-4" style={{ borderColor: "var(--border-default)" }}>
                    {generatedIntelligence.objectionHandlers.slice(0, 2).map((obj, idx) => (
                      <div key={idx}>
                        <p
                          className="font-medium text-sm mb-2"
                          style={{ color: "var(--accent-warning)" }}
                        >
                          {obj.objection}
                        </p>
                        <p
                          className="text-sm"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          {obj.handler}
                        </p>
                      </div>
                    ))}
                    {generatedIntelligence.objectionHandlers.length > 2 && (
                      <p
                        style={{ color: "var(--text-tertiary)" }}
                        className="text-sm italic pt-2"
                      >
                        ...and{" "}
                        {generatedIntelligence.objectionHandlers.length - 2} more
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Success Message */}
            <div
              className="p-4 rounded-lg border"
              style={{
                backgroundColor: "var(--accent-secondary-subtle)",
                borderColor: "var(--accent-secondary)",
              }}
            >
              <div className="flex items-center gap-2">
                <Check
                  size={20}
                  style={{ color: "var(--accent-secondary)" }}
                />
                <p
                  style={{ color: "var(--accent-secondary)" }}
                  className="text-sm font-medium"
                >
                  Your agent is configured and ready!
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setStep("context")}
                className="px-6 py-3 rounded-lg font-medium border transition-all"
                style={{
                  borderColor: "var(--border-default)",
                  color: "var(--text-primary)",
                  backgroundColor: "var(--bg-surface)",
                }}
              >
                Edit Details
              </button>
              <button
                onClick={handleActivateAgent}
                disabled={isActivating}
                className="flex-1 px-6 py-3 rounded-lg font-medium transition-all"
                style={{
                  backgroundColor: "var(--accent-primary)",
                  color: "white",
                  opacity: isActivating ? 0.8 : 1,
                  cursor: isActivating ? "not-allowed" : "pointer",
                }}
              >
                {isActivating ? "Activating..." : "Activate Agent"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
