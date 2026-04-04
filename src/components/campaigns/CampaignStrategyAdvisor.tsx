"use client";

import { useEffect, useState } from "react";
import { Brain, Zap, DollarSign, Clock, Target, AlertTriangle, ChevronRight } from "lucide-react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

interface DashboardSummary {
  missed_calls_today: number;
  no_shows_this_week: number;
  stale_leads: number;
  pending_follow_ups: number;
  qualified_leads: number;
  calls_answered: number;
  conversion_rate: number;
}

interface Recommendation {
  type: "speed-to-lead-recovery" | "no-show-followup" | "stale-lead-reactivation" | "referral-generation";
  priority: "critical" | "high" | "info";
  title: string;
  description: string;
  metric: number;
  impact: {
    recoveryAmount: number;
    estimatedContacts: number;
    riskPerWeek: number;
  };
  settings: {
    profile: "Conservative" | "Standard" | "Assertive";
    timing: string;
    maxAttempts: number;
    rationale: string;
  };
  templateSlug: string;
}

export function CampaignStrategyAdvisor({
  workspaceId,
  selectedTemplate,
}: {
  workspaceId: string;
  selectedTemplate?: string;
}) {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);

  useEffect(() => {
    if (!workspaceId) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const summary = await apiFetch<DashboardSummary>(
          `/api/dashboard/summary?workspace_id=${workspaceId}`
        );
        setData(summary);

        // Generate recommendation based on metrics
        const rec = generateRecommendation(summary);
        setRecommendation(rec);
      } catch (error) {
        console.error("Failed to fetch dashboard summary:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [workspaceId]);

  if (loading || !data || !recommendation) {
    return null;
  }

  return (
    <div
      className="rounded-2xl border overflow-hidden mb-6 animate-fade-in"
      style={{
        backgroundColor: "var(--bg-surface)",
        borderColor: "var(--border-default)",
      }}
    >
      {/* Gradient accent border top */}
      <div
        className="h-1 w-full"
        style={{
          background: `linear-gradient(90deg, var(--accent-primary), var(--accent-secondary, var(--accent-primary)))`,
        }}
      />

      <div className="p-6">
        {/* Header with icon */}
        <div className="flex items-center gap-3 mb-6">
          <div
            className="p-2.5 rounded-lg"
            style={{ backgroundColor: "var(--accent-primary)" }}
          >
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2
              className="text-lg font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              Campaign Strategy Advisor
            </h2>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              AI-powered guidance for maximum impact
            </p>
          </div>
        </div>

        {/* Recommended Priority */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4" style={{ color: "var(--accent-primary)" }} />
            <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              Recommended Priority
            </h3>
          </div>

          <div
            className="rounded-lg p-4 border relative overflow-hidden"
            style={{
              backgroundColor: "var(--bg-hover)",
              borderColor: "var(--border-default)",
            }}
          >
            <div
              className="absolute inset-0 opacity-10"
              style={{
                background: `var(--accent-primary)`,
              }}
            />
            <div className="relative">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4
                    className="font-semibold text-sm mb-1"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {recommendation.title}
                  </h4>
                  <p
                    className="text-sm"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {recommendation.description}
                  </p>
                </div>
                <div
                  className="px-3 py-1 rounded-full text-xs font-semibold ml-2 flex-shrink-0 whitespace-nowrap"
                  style={{
                    backgroundColor:
                      recommendation.priority === "critical"
                        ? "var(--accent-danger, #ef4444)"
                        : recommendation.priority === "high"
                          ? "var(--accent-warning, #f59e0b)"
                          : "var(--accent-primary)",
                    color: "var(--text-on-accent, #fff)",
                  }}
                >
                  {recommendation.priority === "critical"
                    ? "URGENT"
                    : recommendation.priority === "high"
                      ? "HIGH"
                      : "INFO"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Expected Impact */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4" style={{ color: "var(--accent-primary)" }} />
            <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              Expected Impact
            </h3>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {/* Recovery Amount */}
            <div
              className="rounded-lg p-3 border"
              style={{
                backgroundColor: "var(--bg-hover)",
                borderColor: "var(--border-default)",
              }}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <DollarSign className="w-3.5 h-3.5" style={{ color: "var(--accent-primary)" }} />
                <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  Recovery Potential
                </span>
              </div>
              <p
                className="text-sm font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                ~${recommendation.impact.recoveryAmount.toLocaleString()}
              </p>
            </div>

            {/* Estimated Contacts */}
            <div
              className="rounded-lg p-3 border"
              style={{
                backgroundColor: "var(--bg-hover)",
                borderColor: "var(--border-default)",
              }}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <Target className="w-3.5 h-3.5" style={{ color: "var(--accent-primary)" }} />
                <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  Contacts Available
                </span>
              </div>
              <p
                className="text-sm font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                {recommendation.impact.estimatedContacts.toLocaleString()}
              </p>
            </div>

            {/* Risk of Inaction */}
            <div
              className="rounded-lg p-3 border"
              style={{
                backgroundColor: "var(--bg-hover)",
                borderColor: "var(--border-default)",
              }}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <Clock className="w-3.5 h-3.5" style={{ color: "var(--accent-danger, #ef4444)" }} />
                <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  Risk/Week
                </span>
              </div>
              <p
                className="text-sm font-semibold"
                style={{ color: "var(--accent-danger, #ef4444)" }}
              >
                ~${recommendation.impact.riskPerWeek.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Recommended Settings */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-4 h-4" style={{ color: "var(--accent-primary)" }} />
            <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              Recommended Settings
            </h3>
          </div>

          <div className="space-y-2">
            <div className="flex items-start justify-between text-sm">
              <span style={{ color: "var(--text-secondary)" }}>Profile:</span>
              <div className="text-right">
                <p style={{ color: "var(--text-primary)" }} className="font-medium">
                  {recommendation.settings.profile}
                </p>
              </div>
            </div>
            <div className="flex items-start justify-between text-sm">
              <span style={{ color: "var(--text-secondary)" }}>Optimal Timing:</span>
              <p style={{ color: "var(--text-primary)" }} className="font-medium">
                {recommendation.settings.timing}
              </p>
            </div>
            <div className="flex items-start justify-between text-sm">
              <span style={{ color: "var(--text-secondary)" }}>Max Attempts:</span>
              <p style={{ color: "var(--text-primary)" }} className="font-medium">
                {recommendation.settings.maxAttempts}x
              </p>
            </div>
            <div className="pt-2 border-t" style={{ borderColor: "var(--border-default)" }}>
              <p
                className="text-xs italic"
                style={{ color: "var(--text-secondary)" }}
              >
                {recommendation.settings.rationale}
              </p>
            </div>
          </div>
        </div>

        {/* Quick Launch Button */}
        <Link
          href={`/app/campaigns/create?template=${recommendation.templateSlug}`}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold transition-all duration-200 text-white"
          style={{
            backgroundColor: "var(--accent-primary)",
          }}
        >
          <Zap className="w-4 h-4" />
          Create campaign
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fadeIn 400ms cubic-bezier(0.23, 1, 0.32, 1) both;
        }
      `}</style>
    </div>
  );
}

function generateRecommendation(data: DashboardSummary): Recommendation {
  // Priority 1: Speed-to-Lead Recovery (missed calls today)
  if (data.missed_calls_today > 3) {
    return {
      type: "speed-to-lead-recovery",
      priority: "critical",
      title: `PRIORITY: Speed-to-Lead Recovery`,
      description: `You have ${data.missed_calls_today} unanswered opportunities today. Every minute of delay reduces conversion by 10%.`,
      metric: data.missed_calls_today,
      impact: {
        recoveryAmount: data.missed_calls_today * 150,
        estimatedContacts: data.missed_calls_today,
        riskPerWeek: data.missed_calls_today * 7 * 50,
      },
      settings: {
        profile: "Assertive",
        timing: "Immediate (next 4 hours)",
        maxAttempts: 4,
        rationale:
          "High-intent prospects need immediate follow-up. Fast turnaround prevents call abandonment.",
      },
      templateSlug: "speed_to_lead",
    };
  }

  // Priority 2: No-Show Recovery (no-shows this week)
  if (data.no_shows_this_week > 2) {
    return {
      type: "no-show-followup",
      priority: "high",
      title: `PRIORITY: No-Show Recovery`,
      description: `${data.no_shows_this_week} no-shows this week represent ~$${(data.no_shows_this_week * 50).toLocaleString()} in at-risk revenue.`,
      metric: data.no_shows_this_week,
      impact: {
        recoveryAmount: data.no_shows_this_week * 75,
        estimatedContacts: data.no_shows_this_week,
        riskPerWeek: data.no_shows_this_week * 50,
      },
      settings: {
        profile: "Standard",
        timing: "Within 24 hours",
        maxAttempts: 3,
        rationale:
          "No-shows signal intent mismatch. Re-engagement typically recovers 15-25% of failed appointments.",
      },
      templateSlug: "no_show_recovery",
    };
  }

  // Priority 3: Stale Lead Reactivation
  if (data.stale_leads > 10) {
    return {
      type: "stale-lead-reactivation",
      priority: "high",
      title: `PRIORITY: Stale Lead Reactivation`,
      description: `${data.stale_leads} cold leads sitting in your pipeline represent ~$${(data.stale_leads * 40).toLocaleString()} in dormant opportunity.`,
      metric: data.stale_leads,
      impact: {
        recoveryAmount: data.stale_leads * 40,
        estimatedContacts: data.stale_leads,
        riskPerWeek: 0,
      },
      settings: {
        profile: "Conservative",
        timing: "Spread over 2 weeks",
        maxAttempts: 2,
        rationale:
          "Stale leads need re-engagement but with lower intensity. Value is in reminder + discount incentive.",
      },
      templateSlug: "reactivation",
    };
  }

  // Default: Referral Generation (healthy pipeline)
  return {
    type: "referral-generation",
    priority: "info",
    title: "Your Pipeline is Performing Well",
    description: `Consider launching a post-service review campaign to generate referrals from recent conversions.`,
    metric: data.qualified_leads,
    impact: {
      recoveryAmount: Math.max(1000, data.qualified_leads * 100),
      estimatedContacts: Math.max(20, data.qualified_leads),
      riskPerWeek: 0,
    },
    settings: {
      profile: "Standard",
      timing: "Ongoing, weekly",
      maxAttempts: 2,
      rationale:
        "Referral campaigns leverage your best customers. Lower cost-per-acquisition with higher-quality leads.",
    },
    templateSlug: "review_request",
  };
}
