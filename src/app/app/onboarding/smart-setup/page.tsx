"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PLAYBOOKS, getPlaybooksByCategory, type Playbook } from "@/lib/ai/playbooks";
import { useWorkspace } from "@/components/WorkspaceContext";

type SetupStep = "select-playbook" | "preview-agent" | "loading";

interface ChatMessage {
  id: string;
  type: "lead" | "agent";
  text: string;
  isVisible: boolean;
}

export default function SmartSetupPage() {
  const router = useRouter();
  const { workspaceId } = useWorkspace();
  const [step, setStep] = useState<SetupStep>("select-playbook");
  const [selectedPlaybook, setSelectedPlaybook] = useState<Playbook | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isActivating, setIsActivating] = useState(false);
  const [agentName, setAgentName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [showCustomization, setShowCustomization] = useState(false);

  const router_internal = useRouter();

  // Get all unique categories
  const categories = ["All", ...Object.keys(getPlaybooksByCategory()).sort()];

  // Filter playbooks by category
  const filteredPlaybooks =
    selectedCategory === "All"
      ? PLAYBOOKS
      : PLAYBOOKS.filter((p) => p.category === selectedCategory);

  // Handle playbook selection -> move to preview
  const handlePlaybookSelect = (playbook: Playbook) => {
    setSelectedPlaybook(playbook);
    setAgentName(playbook.agent_name_suggestion);
    setBusinessName("");
    setChatMessages([]);
    setShowCustomization(false);
    setStep("preview-agent");

    // Animate chat messages
    playbook.sample_scenarios.slice(0, 5).forEach((scenario, idx) => {
      setTimeout(() => {
        setChatMessages((prev) => [
          ...prev,
          {
            id: `lead-${idx}`,
            type: "lead",
            text: scenario.scenario,
            isVisible: true,
          },
          {
            id: `agent-${idx}`,
            type: "agent",
            text: scenario.agent_response,
            isVisible: true,
          },
        ]);
      }, idx * 800);
    });
  };

  // Handle activate agent
  const handleActivateAgent = async () => {
    if (!selectedPlaybook) return;

    setIsActivating(true);
    try {
      if (!workspaceId) {
        throw new Error("Workspace not found. Please complete setup first.");
      }

      const response = await fetch("/api/workspace/apply-playbook", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace_id: workspaceId,
          playbook_id: selectedPlaybook.id,
          customizations: {
            agent_name: agentName,
            business_name: businessName,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to apply playbook");
      }

      const result = await response.json();
      setStep("loading");
      toast.success(`Your operator "${result.agent_name}" is live and ready to take calls!`);

      // Redirect to agent page if agent was created, otherwise to dashboard
      const redirectUrl = result.agent_id
        ? `/app/agents/${result.agent_id}`
        : "/app/dashboard";

      setTimeout(() => {
        router_internal.push(redirectUrl);
      }, 2000);
    } catch (error) {
      toast.error("Could not activate your operator — check your internet connection and try again.");
      setIsActivating(false);
    }
  };

  // Handle custom business description fallback
  const handleCustomDescription = async (description: string) => {
    try {
      if (!workspaceId) {
        throw new Error("Workspace not found. Please complete setup first.");
      }

      setStep("loading");
      toast.success("Building your operator...");

      const response = await fetch("/api/workspace/auto-setup", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace_id: workspaceId,
          business_description: description,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to process custom description");
      }

      setTimeout(() => {
        router_internal.push("/app/dashboard");
      }, 2000);
    } catch (error) {
      toast.error("Setup step failed — please try again. If this persists, contact support.");
      setStep("preview-agent");
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--bg-primary)" }}>
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
        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .animate-slide-in {
          animation: slideInLeft 0.4s ease-out;
        }
        .chat-bubble {
          border-radius: var(--rounded-xl, 1.25rem);
          padding: 12px 16px;
          max-width: 90%;
          word-wrap: break-word;
        }
        .chat-bubble.lead {
          background-color: var(--bg-surface);
          color: var(--text-primary);
          margin-right: auto;
        }
        .chat-bubble.agent {
          background-color: var(--accent-primary);
          color: white;
          margin-left: auto;
        }
        .playbook-card {
          border-radius: 1.25rem;
          border: 2px solid var(--border-default);
          background-color: var(--bg-surface);
          transition: all 0.3s ease;
          cursor: pointer;
        }
        .playbook-card:hover {
          border-color: var(--accent-primary);
          transform: translateY(-4px);
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
        }
        .playbook-card.selected {
          border-color: var(--accent-primary);
          background-color: var(--bg-hover);
        }
        .category-pill {
          padding: 8px 16px;
          border-radius: 2rem;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          border: 1px solid var(--border-default);
          background-color: var(--bg-surface);
          color: var(--text-primary);
          transition: all 0.2s ease;
        }
        .category-pill.active {
          background-color: var(--accent-primary);
          color: white;
          border-color: var(--accent-primary);
        }
        .category-pill:hover {
          border-color: var(--accent-primary);
        }
        .input-field {
          width: 100%;
          padding: 12px 16px;
          border-radius: 0.75rem;
          border: 1px solid var(--border-default);
          background-color: var(--bg-surface);
          color: var(--text-primary);
          font-size: 0.875rem;
          transition: all 0.2s ease;
        }
        .input-field:focus {
          outline: none;
          border-color: var(--accent-primary);
          box-shadow: 0 0 0 3px rgba(var(--accent-primary-rgb), 0.1);
        }
        .btn-primary {
          padding: 12px 24px;
          border-radius: 0.75rem;
          font-weight: 600;
          font-size: 0.875rem;
          background-color: var(--accent-primary);
          color: white;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .btn-primary:hover:not(:disabled) {
          opacity: 0.9;
          transform: translateY(-1px);
        }
        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .btn-secondary {
          padding: 12px 24px;
          border-radius: 0.75rem;
          font-weight: 500;
          font-size: 0.875rem;
          background-color: var(--bg-surface);
          color: var(--text-primary);
          border: 1px solid var(--border-default);
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .btn-secondary:hover {
          border-color: var(--text-primary);
        }
      `}</style>

      {/* STEP 1: Select Playbook */}
      {step === "select-playbook" && (
        <div className="min-h-screen p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-12 text-center animate-fade-in-up">
              <h1
                className="text-4xl lg:text-5xl font-bold mb-3"
                style={{ color: "var(--text-primary)" }}
              >
                What do you do?
              </h1>
              <p
                style={{ color: "var(--text-secondary)" }}
                className="text-lg"
              >
                Pick your role and we&apos;ll show you your operator in action
              </p>
            </div>

            {/* Category Filter */}
            <div className="mb-8 flex flex-wrap gap-2 justify-center animate-fade-in-up">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className="category-pill"
                  style={{
                    backgroundColor:
                      selectedCategory === cat
                        ? "var(--accent-primary)"
                        : "var(--bg-surface)",
                    color: selectedCategory === cat ? "white" : "var(--text-primary)",
                    borderColor:
                      selectedCategory === cat
                        ? "var(--accent-primary)"
                        : "var(--border-default)",
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Playbook Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12 animate-fade-in-up">
              {filteredPlaybooks.map((playbook) => (
                <button
                  key={playbook.id}
                  onClick={() => handlePlaybookSelect(playbook)}
                  className="playbook-card text-left p-6 hover:shadow-lg"
                >
                  <div className="text-5xl mb-4">{playbook.icon}</div>
                  <h3
                    className="text-xl font-bold mb-2"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {playbook.title}
                  </h3>
                  <p
                    className="text-sm"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {playbook.subtitle}
                  </p>
                </button>
              ))}
            </div>

            {/* Fallback to Custom Description */}
            <div className="text-center animate-fade-in-up">
              <p style={{ color: "var(--text-secondary)" }} className="text-sm mb-3">
                Don't see your role?{" "}
                <button
                  onClick={() => {
                    const description = prompt(
                      "Describe what you do and who you're selling to:"
                    );
                    if (description) {
                      handleCustomDescription(description);
                    }
                  }}
                  className="underline hover:opacity-80 transition-opacity font-medium"
                  style={{ color: "var(--accent-primary)" }}
                >
                  Describe it instead
                </button>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: Preview Agent */}
      {step === "preview-agent" && selectedPlaybook && (
        <div className="min-h-screen p-6 lg:p-8">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-8 animate-fade-in-up">
              <button
                onClick={() => setStep("select-playbook")}
                className="text-sm font-medium mb-4"
                style={{ color: "var(--accent-primary)" }}
              >
                ← Back to selection
              </button>
              <h1
                className="text-4xl font-bold mb-2"
                style={{ color: "var(--text-primary)" }}
              >
                Meet your operator
              </h1>
              <p style={{ color: "var(--text-secondary)" }}>
                Here's how {selectedPlaybook.title} handles real situations
              </p>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left: Chat Preview (60%) */}
              <div className="lg:col-span-2 animate-fade-in-up">
                <div
                  className="p-6 rounded-2xl border"
                  style={{
                    backgroundColor: "var(--bg-surface)",
                    borderColor: "var(--border-default)",
                    minHeight: "500px",
                  }}
                >
                  {/* Chat Messages */}
                  <div className="space-y-4 overflow-y-auto max-h-96 mb-6">
                    {chatMessages.length === 0 ? (
                      <div className="text-center py-12">
                        <p
                          style={{ color: "var(--text-tertiary)" }}
                          className="text-sm"
                        >
                          Loading scenarios...
                        </p>
                      </div>
                    ) : (
                      chatMessages.map((msg, idx) => (
                        <div
                          key={msg.id}
                          className={`chat-bubble animate-slide-in ${msg.type}`}
                          style={{
                            animationDelay: `${idx * 0.1}s`,
                          }}
                        >
                          {msg.type === "lead" ? "Lead: " : "Agent: "}
                          {msg.text}
                        </div>
                      ))
                    )}
                  </div>

                  {/* Stats */}
                  <div
                    className="p-4 rounded-lg border-t pt-6"
                    style={{
                      borderColor: "var(--border-default)",
                      backgroundColor: "var(--bg-primary)",
                    }}
                  >
                    <p
                      className="text-sm"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Your operator knows:
                    </p>
                    <ul
                      className="text-xs mt-3 space-y-1"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      <li>✓ {selectedPlaybook.objection_handlers.length} objection handlers</li>
                      <li>✓ {selectedPlaybook.faqs.length} FAQs</li>
                      <li>✓ {selectedPlaybook.follow_up_sms_templates.length} follow-up templates</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Right: Config & Activate (40%) */}
              <div className="lg:col-span-1 animate-fade-in-up">
                <div
                  className="p-6 rounded-2xl border sticky top-8"
                  style={{
                    backgroundColor: "var(--bg-surface)",
                    borderColor: "var(--border-default)",
                  }}
                >
                  {/* Playbook Header */}
                  <div className="mb-6">
                    <div className="text-4xl mb-3">{selectedPlaybook.icon}</div>
                    <h2
                      className="text-2xl font-bold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {selectedPlaybook.title}
                    </h2>
                    <p
                      className="text-sm mt-1"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {selectedPlaybook.subtitle}
                    </p>
                  </div>

                  {/* Agent Name Input */}
                  <div className="mb-4">
                    <label
                      htmlFor="agent-name"
                      className="block text-sm font-medium mb-2"
                      style={{ color: "var(--text-primary)" }}
                    >
                      Agent Name
                    </label>
                    <input
                      id="agent-name"
                      type="text"
                      value={agentName}
                      onChange={(e) => setAgentName(e.target.value)}
                      className="input-field"
                      placeholder={selectedPlaybook.agent_name_suggestion}
                    />
                  </div>

                  {/* Business Name Input */}
                  <div className="mb-6">
                    <label
                      htmlFor="business-name"
                      className="block text-sm font-medium mb-2"
                      style={{ color: "var(--text-primary)" }}
                    >
                      Business Name (Optional)
                    </label>
                    <input
                      id="business-name"
                      type="text"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      className="input-field"
                      placeholder="Your company name"
                    />
                  </div>

                  {/* Activate Button */}
                  <button
                    onClick={handleActivateAgent}
                    disabled={isActivating}
                    className="btn-primary w-full mb-4"
                  >
                    {isActivating ? "Activating..." : "Activate Agent"}
                  </button>

                  {/* Customization Link */}
                  <div className="border-t pt-4" style={{ borderColor: "var(--border-default)" }}>
                    <button
                      onClick={() => setShowCustomization(!showCustomization)}
                      className="text-sm font-medium w-full text-left"
                      style={{ color: "var(--accent-primary)" }}
                    >
                      {showCustomization ? "Hide customization →" : "Show customization →"}
                    </button>

                    {/* Expandable Customization Section */}
                    {showCustomization && (
                      <div className="mt-4 space-y-4 pt-4 border-t" style={{ borderColor: "var(--border-default)" }}>
                        {/* Greeting Script */}
                        <div>
                          <h4
                            className="text-sm font-medium mb-2"
                            style={{ color: "var(--text-primary)" }}
                          >
                            Greeting Script
                          </h4>
                          <textarea
                            value={selectedPlaybook.greeting_script}
                            readOnly
                            className="input-field text-xs min-h-20 resize-none opacity-75"
                          />
                        </div>

                        {/* Sample FAQs */}
                        <div>
                          <h4
                            className="text-sm font-medium mb-2"
                            style={{ color: "var(--text-primary)" }}
                          >
                            Sample FAQs
                          </h4>
                          <div className="space-y-3">
                            {selectedPlaybook.faqs.slice(0, 2).map((faq, idx) => (
                              <div key={idx} className="text-xs">
                                <p
                                  className="font-medium mb-1"
                                  style={{ color: "var(--accent-primary)" }}
                                >
                                  Q: {faq.q}
                                </p>
                                <p style={{ color: "var(--text-secondary)" }}>
                                  A: {faq.a.substring(0, 80)}...
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: Loading */}
      {step === "loading" && (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="text-center">
            <div
              className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center animate-spin"
              style={{
                backgroundColor: "var(--bg-surface)",
                borderTop: "3px solid var(--accent-primary)",
                borderRight: "3px solid transparent",
              }}
            />
            <h2
              className="text-2xl font-bold mb-2"
              style={{ color: "var(--text-primary)" }}
            >
              Activating your operator...
            </h2>
            <p style={{ color: "var(--text-secondary)" }}>
              This usually takes a few seconds
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
