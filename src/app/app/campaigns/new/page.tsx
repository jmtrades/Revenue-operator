"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useWorkspaceSafe } from "@/components/WorkspaceContext";
import {
  Zap,
  Eye,
  TrendingUp,
  Calendar,
  Clock,
  Upload,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Brain,
} from "lucide-react";

type Step = "details" | "audience" | "schedule" | "review";
type CampaignMode = "power" | "preview" | "progressive";
type LeadSource = "all" | "tag" | "csv" | "manual";

const getModeConfigs = (t: ReturnType<typeof useTranslations>) => ({
  power: {
    icon: Zap,
    label: t("create.modes.power.label"),
    description: t("create.modes.power.description"),
  },
  preview: {
    icon: Eye,
    label: t("create.modes.preview.label"),
    description: t("create.modes.preview.description"),
  },
  progressive: {
    icon: TrendingUp,
    label: t("create.modes.progressive.label"),
    description: t("create.modes.progressive.description"),
  },
});

const STEPS: Step[] = ["details", "audience", "schedule", "review"];

const getStepLabels = (t: ReturnType<typeof useTranslations>): Record<Step, string> => ({
  details: t("create.steps.details"),
  audience: t("create.steps.audience"),
  schedule: t("create.steps.schedule"),
  review: t("create.steps.review"),
});

export default function CampaignCreationPage() {
  const t = useTranslations("campaigns");
  const router = useRouter();
  const workspace = useWorkspaceSafe();
  const [currentStep, setCurrentStep] = useState<Step>("details");
  const [isLoading, setIsLoading] = useState(false);
  const MODE_CONFIGS = getModeConfigs(t);
  const STEP_LABELS = getStepLabels(t);

  // Get template recommendation from URL
  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const templateParam = searchParams.get("template");

  // Step 1: Campaign Details
  const [campaignName, setCampaignName] = useState("");
  const [campaignMode, setCampaignMode] = useState<CampaignMode>("preview");
  const [description, setDescription] = useState("");

  // Step 2: Audience
  const [leadSource, setLeadSource] = useState<LeadSource>("all");
  const [tagFilter, setTagFilter] = useState("");
  const [dncExclusionEnabled, setDncExclusionEnabled] = useState(true);
  const [estimatedAudienceCount, setEstimatedAudienceCount] = useState(0);

  // Step 3: Schedule
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endDate, setEndDate] = useState("");
  const [callingStartTime, setCallingStartTime] = useState("09:00");
  const [callingEndTime, setCallingEndTime] = useState("20:00");
  const [activeDays, setActiveDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [maxCallsPerDay, setMaxCallsPerDay] = useState("100");
  const [maxAttempts, setMaxAttempts] = useState("3");
  const [retryDelay, setRetryDelay] = useState("60");

  const currentStepIndex = STEPS.indexOf(currentStep);

  const isStep1Valid = campaignName.trim().length > 0;
  const isStep2Valid = leadSource !== "tag" || tagFilter.trim().length > 0;
  const isStep3Valid = startDate.length > 0;

  const canAdvance = () => {
    if (currentStep === "details") return isStep1Valid;
    if (currentStep === "audience") return isStep2Valid;
    if (currentStep === "schedule") return isStep3Valid;
    return true;
  };

  const handleNext = () => {
    if (!canAdvance()) return;
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) {
      setCurrentStep(STEPS[nextIndex]);
    }
  };

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex]);
    }
  };

  const estimatedDays = useMemo(() => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }, [startDate, endDate]);

  const estimatedCompletionTime = useMemo(() => {
    if (estimatedAudienceCount === 0 || maxCallsPerDay === "") return "N/A";
    const daysNeeded = Math.ceil(estimatedAudienceCount / parseInt(maxCallsPerDay));
    return `${daysNeeded} days`;
  }, [estimatedAudienceCount, maxCallsPerDay]);

  const handleLaunch = async () => {
    if (!workspace) return;
    setIsLoading(true);

    try {
      const payload = {
        workspace_id: workspace.workspaceId,
        name: campaignName,
        mode: campaignMode,
        from_number: "workspace_default",
        settings: {
          max_calls_per_day: parseInt(maxCallsPerDay) || 100,
          max_attempts_per_lead: parseInt(maxAttempts) || 3,
          retry_delay_minutes: parseInt(retryDelay) || 60,
          calling_hours: {
            start: callingStartTime,
            end: callingEndTime,
          },
          calling_days: activeDays,
          dnc_exclusion_enabled: dncExclusionEnabled,
          lead_source: leadSource,
          tag_filter: leadSource === "tag" ? tagFilter : undefined,
          start_date: startDate,
          start_time: startTime,
          end_date: endDate || undefined,
          description: description,
          voicemail_behavior: "drop",
          recording_enabled: true,
          preview_delay_seconds: campaignMode === "preview" ? 5 : 0,
          ring_timeout_seconds: 25,
        },
      };

      const response = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to create campaign");
      }

      router.push("/app/campaigns");
    } catch (error) {
      setIsLoading(false);
      console.error("Campaign creation failed:", error);
    }
  };

  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ backgroundColor: "var(--bg-primary)" }}>
      <div className="max-w-[800px] mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
            Execute Autonomous Campaign
          </h1>
          <p style={{ color: "var(--text-secondary)" }}>
            Deploy intelligent revenue execution to qualify leads, recover revenue, or re-engage pipeline
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {STEPS.map((step, index) => (
              <div key={step} className="flex items-center flex-1">
                <button
                  onClick={() => {
                    if (index <= currentStepIndex) {
                      setCurrentStep(step);
                    }
                  }}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                    index <= currentStepIndex
                      ? "cursor-pointer"
                      : "cursor-not-allowed opacity-50"
                  }`}
                  style={{
                    backgroundColor:
                      index === currentStepIndex
                        ? "var(--accent-primary)"
                        : index < currentStepIndex
                          ? "var(--accent-success)"
                          : "var(--bg-hover)",
                    color:
                      index <= currentStepIndex
                        ? "var(--text-primary-contrast)"
                        : "var(--text-tertiary)",
                  }}
                >
                  {index < currentStepIndex ? "✓" : index + 1}
                </button>
                {index < STEPS.length - 1 && (
                  <div
                    className="flex-1 h-1 mx-2"
                    style={{
                      backgroundColor:
                        index < currentStepIndex
                          ? "var(--accent-success)"
                          : "var(--bg-hover)",
                    }}
                  />
                )}
              </div>
            ))}
          </div>
          <p
            className="text-center text-sm font-medium"
            style={{ color: "var(--text-secondary)" }}
          >
            {STEP_LABELS[currentStep]}
          </p>
        </div>

        {/* Form Container */}
        <div
          className="rounded-xl p-6 border"
          style={{
            backgroundColor: "var(--bg-surface)",
            borderColor: "var(--border-default)",
          }}
        >
          {/* Step 1: Campaign Details */}
          {currentStep === "details" && (
            <div className="space-y-6">
              {/* Intelligence Callout */}
              {templateParam && (
                <div
                  className="rounded-lg p-4 border flex gap-3"
                  style={{
                    backgroundColor: "var(--accent-primary)",
                    borderColor: "var(--accent-primary)",
                    opacity: 0.1,
                  }}
                >
                  <Brain
                    className="w-5 h-5 flex-shrink-0 mt-0.5"
                    style={{ color: "var(--accent-primary)" }}
                  />
                  <div className="flex-1">
                    <p
                      className="text-sm font-medium"
                      style={{ color: "var(--text-primary)" }}
                    >
                      AI Recommended
                    </p>
                    <p
                      className="text-sm"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {templateParam === "speed-to-lead-recovery" &&
                        "This template targets your missed calls from today. Fast follow-up recovers ~10% additional conversions."}
                      {templateParam === "no-show-followup" &&
                        "This template re-engages no-shows from this week. Recovery typically converts 15-25% back to appointments."}
                      {templateParam === "stale-lead-reactivation" &&
                        "This template reactivates leads with 7+ days of inactivity. Conservative approach with higher engagement."}
                      {templateParam === "post-service-review" &&
                        "Leverage your recent wins. Referral campaigns drive lower CAC with higher-quality leads."}
                      {templateParam === "custom" &&
                        "Match your campaign type to your recovery goal for best results."}
                    </p>
                  </div>
                </div>
              )}

              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: "var(--text-primary)" }}
                >
                  Campaign Name *
                </label>
                <input
                  type="text"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="e.g., Q1 Sales Push"
                  className="w-full px-4 py-2 rounded-lg border transition-colors focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: "var(--bg-primary)",
                    borderColor: "var(--border-default)",
                    color: "var(--text-primary)",
                    "--tw-ring-color": "var(--accent-primary)",
                  } as React.CSSProperties}
                />
              </div>

              <div>
                <label
                  className="block text-sm font-medium mb-3"
                  style={{ color: "var(--text-primary)" }}
                >
                  Execution Mode *
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(Object.entries(MODE_CONFIGS) as [CampaignMode, typeof MODE_CONFIGS.power][]).map(
                    ([mode, config]) => {
                      const Icon = config.icon;
                      return (
                        <button
                          key={mode}
                          onClick={() => setCampaignMode(mode)}
                          className={`p-4 rounded-lg border-2 transition-all text-left ${
                            campaignMode === mode
                              ? "border-2"
                              : "border-2"
                          }`}
                          style={{
                            backgroundColor:
                              campaignMode === mode
                                ? "var(--bg-hover)"
                                : "var(--bg-primary)",
                            borderColor:
                              campaignMode === mode
                                ? "var(--accent-primary)"
                                : "var(--border-default)",
                          }}
                        >
                          <Icon
                            className="w-5 h-5 mb-2"
                            style={{
                              color:
                                campaignMode === mode
                                  ? "var(--accent-primary)"
                                  : "var(--text-secondary)",
                            }}
                          />
                          <p
                            className="text-sm font-semibold"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {config.label}
                          </p>
                          <p
                            className="text-xs"
                            style={{ color: "var(--text-tertiary)" }}
                          >
                            {config.description}
                          </p>
                        </button>
                      );
                    }
                  )}
                </div>
              </div>

              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: "var(--text-primary)" }}
                >
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add notes about this campaign..."
                  rows={4}
                  className="w-full px-4 py-2 rounded-lg border transition-colors focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: "var(--bg-primary)",
                    borderColor: "var(--border-default)",
                    color: "var(--text-primary)",
                    "--tw-ring-color": "var(--accent-primary)",
                  } as React.CSSProperties}
                />
              </div>
            </div>
          )}

          {/* Step 2: Audience */}
          {currentStep === "audience" && (
            <div className="space-y-6">
              <div>
                <label
                  className="block text-sm font-medium mb-3"
                  style={{ color: "var(--text-primary)" }}
                >
                  Lead Source *
                </label>
                <div className="space-y-2">
                  {(["all", "tag", "csv", "manual"] as const).map((source) => (
                    <label
                      key={source}
                      className="flex items-center p-3 rounded-lg border cursor-pointer transition-colors"
                      style={{
                        backgroundColor:
                          leadSource === source
                            ? "var(--bg-hover)"
                            : "var(--bg-primary)",
                        borderColor:
                          leadSource === source
                            ? "var(--accent-primary)"
                            : "var(--border-default)",
                      }}
                    >
                      <input
                        type="radio"
                        name="lead-source"
                        value={source}
                        checked={leadSource === source}
                        onChange={(e) => setLeadSource(e.target.value as LeadSource)}
                        className="w-4 h-4 mr-3"
                        style={{ accentColor: "var(--accent-primary)" }}
                      />
                      <span style={{ color: "var(--text-primary)" }}>
                        {source === "all" && "All leads"}
                        {source === "tag" && "Tag filter"}
                        {source === "csv" && "CSV upload"}
                        {source === "manual" && "Manual selection"}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {leadSource === "tag" && (
                <div>
                  <label
                    className="block text-sm font-medium mb-2"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Tag Filter *
                  </label>
                  <input
                    type="text"
                    value={tagFilter}
                    onChange={(e) => setTagFilter(e.target.value)}
                    placeholder="Enter tag name..."
                    className="w-full px-4 py-2 rounded-lg border transition-colors focus:outline-none focus:ring-2"
                    style={{
                      backgroundColor: "var(--bg-primary)",
                      borderColor: "var(--border-default)",
                      color: "var(--text-primary)",
                      "--tw-ring-color": "var(--accent-primary)",
                    } as React.CSSProperties}
                  />
                </div>
              )}

              {leadSource === "csv" && (
                <div>
                  <label
                    className="block text-sm font-medium mb-2"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Upload CSV *
                  </label>
                  <div
                    className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors hover:bg-opacity-50"
                    style={{
                      borderColor: "var(--border-default)",
                      backgroundColor: "var(--bg-primary)",
                    }}
                  >
                    <Upload
                      className="w-8 h-8 mx-auto mb-2"
                      style={{ color: "var(--text-secondary)" }}
                    />
                    <p style={{ color: "var(--text-primary)" }}>
                      Drop CSV file here or click to browse
                    </p>
                  </div>
                </div>
              )}

              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: "var(--text-primary)" }}
                >
                  Estimated Audience Count
                </label>
                <input
                  type="number"
                  value={estimatedAudienceCount}
                  onChange={(e) => setEstimatedAudienceCount(parseInt(e.target.value) || 0)}
                  placeholder="e.g., 500"
                  className="w-full px-4 py-2 rounded-lg border transition-colors focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: "var(--bg-primary)",
                    borderColor: "var(--border-default)",
                    color: "var(--text-primary)",
                    "--tw-ring-color": "var(--accent-primary)",
                  } as React.CSSProperties}
                />
              </div>

              <div className="flex items-center p-3 rounded-lg" style={{ backgroundColor: "var(--bg-hover)" }}>
                <input
                  type="checkbox"
                  id="dnc"
                  checked={dncExclusionEnabled}
                  onChange={(e) => setDncExclusionEnabled(e.target.checked)}
                  className="w-4 h-4 mr-3"
                  style={{ accentColor: "var(--accent-primary)" }}
                />
                <label htmlFor="dnc" style={{ color: "var(--text-primary)" }}>
                  Exclude DNC (Do Not Call) leads
                </label>
              </div>
            </div>
          )}

          {/* Step 3: Schedule */}
          {currentStep === "schedule" && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    className="block text-sm font-medium mb-2"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border transition-colors focus:outline-none focus:ring-2"
                    style={{
                      backgroundColor: "var(--bg-primary)",
                      borderColor: "var(--border-default)",
                      color: "var(--text-primary)",
                      "--tw-ring-color": "var(--accent-primary)",
                    } as React.CSSProperties}
                  />
                </div>
                <div>
                  <label
                    className="block text-sm font-medium mb-2"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border transition-colors focus:outline-none focus:ring-2"
                    style={{
                      backgroundColor: "var(--bg-primary)",
                      borderColor: "var(--border-default)",
                      color: "var(--text-primary)",
                      "--tw-ring-color": "var(--accent-primary)",
                    } as React.CSSProperties}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    className="block text-sm font-medium mb-2"
                    style={{ color: "var(--text-primary)" }}
                  >
                    End Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border transition-colors focus:outline-none focus:ring-2"
                    style={{
                      backgroundColor: "var(--bg-primary)",
                      borderColor: "var(--border-default)",
                      color: "var(--text-primary)",
                      "--tw-ring-color": "var(--accent-primary)",
                    } as React.CSSProperties}
                  />
                </div>
              </div>

              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: "var(--text-primary)" }}
                >
                  Calling Hours
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      className="block text-xs font-medium mb-1"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={callingStartTime}
                      onChange={(e) => setCallingStartTime(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border transition-colors focus:outline-none focus:ring-2"
                      style={{
                        backgroundColor: "var(--bg-primary)",
                        borderColor: "var(--border-default)",
                        color: "var(--text-primary)",
                        "--tw-ring-color": "var(--accent-primary)",
                      } as React.CSSProperties}
                    />
                  </div>
                  <div>
                    <label
                      className="block text-xs font-medium mb-1"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      End Time
                    </label>
                    <input
                      type="time"
                      value={callingEndTime}
                      onChange={(e) => setCallingEndTime(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border transition-colors focus:outline-none focus:ring-2"
                      style={{
                        backgroundColor: "var(--bg-primary)",
                        borderColor: "var(--border-default)",
                        color: "var(--text-primary)",
                        "--tw-ring-color": "var(--accent-primary)",
                      } as React.CSSProperties}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label
                  className="block text-sm font-medium mb-3"
                  style={{ color: "var(--text-primary)" }}
                >
                  Active Days
                </label>
                <div className="grid grid-cols-7 gap-2">
                  {dayLabels.map((day, index) => (
                    <button
                      key={day}
                      onClick={() => {
                        setActiveDays((prev) =>
                          prev.includes(index)
                            ? prev.filter((d) => d !== index)
                            : [...prev, index]
                        );
                      }}
                      className="p-2 rounded-lg border-2 transition-all text-sm font-medium"
                      style={{
                        backgroundColor: activeDays.includes(index)
                          ? "var(--bg-hover)"
                          : "var(--bg-primary)",
                        borderColor: activeDays.includes(index)
                          ? "var(--accent-primary)"
                          : "var(--border-default)",
                        color: "var(--text-primary)",
                      }}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label
                    className="block text-sm font-medium mb-2"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Max Calls/Day
                  </label>
                  <input
                    type="number"
                    value={maxCallsPerDay}
                    onChange={(e) => setMaxCallsPerDay(e.target.value)}
                    placeholder="100"
                    className="w-full px-4 py-2 rounded-lg border transition-colors focus:outline-none focus:ring-2"
                    style={{
                      backgroundColor: "var(--bg-primary)",
                      borderColor: "var(--border-default)",
                      color: "var(--text-primary)",
                      "--tw-ring-color": "var(--accent-primary)",
                    } as React.CSSProperties}
                  />
                </div>
                <div>
                  <label
                    className="block text-sm font-medium mb-2"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Max Attempts
                  </label>
                  <input
                    type="number"
                    value={maxAttempts}
                    onChange={(e) => setMaxAttempts(e.target.value)}
                    placeholder="3"
                    className="w-full px-4 py-2 rounded-lg border transition-colors focus:outline-none focus:ring-2"
                    style={{
                      backgroundColor: "var(--bg-primary)",
                      borderColor: "var(--border-default)",
                      color: "var(--text-primary)",
                      "--tw-ring-color": "var(--accent-primary)",
                    } as React.CSSProperties}
                  />
                </div>
                <div>
                  <label
                    className="block text-sm font-medium mb-2"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Retry Delay (min)
                  </label>
                  <input
                    type="number"
                    value={retryDelay}
                    onChange={(e) => setRetryDelay(e.target.value)}
                    placeholder="60"
                    className="w-full px-4 py-2 rounded-lg border transition-colors focus:outline-none focus:ring-2"
                    style={{
                      backgroundColor: "var(--bg-primary)",
                      borderColor: "var(--border-default)",
                      color: "var(--text-primary)",
                      "--tw-ring-color": "var(--accent-primary)",
                    } as React.CSSProperties}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {currentStep === "review" && (
            <div className="space-y-6">
              <div
                className="rounded-lg p-4 border"
                style={{
                  backgroundColor: "var(--bg-hover)",
                  borderColor: "var(--border-default)",
                }}
              >
                <h3
                  className="text-sm font-semibold mb-3"
                  style={{ color: "var(--text-primary)" }}
                >
                  Campaign Summary
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span style={{ color: "var(--text-secondary)" }}>Name:</span>
                    <span style={{ color: "var(--text-primary)" }}>
                      {campaignName}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: "var(--text-secondary)" }}>Type:</span>
                    <span style={{ color: "var(--text-primary)" }}>
                      {MODE_CONFIGS[campaignMode].label}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: "var(--text-secondary)" }}>
                      Lead Source:
                    </span>
                    <span style={{ color: "var(--text-primary)" }}>
                      {leadSource === "all" && "All leads"}
                      {leadSource === "tag" && `Tag: ${tagFilter}`}
                      {leadSource === "csv" && "CSV upload"}
                      {leadSource === "manual" && "Manual selection"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: "var(--text-secondary)" }}>
                      Audience Size:
                    </span>
                    <span style={{ color: "var(--text-primary)" }}>
                      {estimatedAudienceCount} leads
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: "var(--text-secondary)" }}>
                      Start Date:
                    </span>
                    <span style={{ color: "var(--text-primary)" }}>
                      {startDate}
                    </span>
                  </div>
                  {endDate && (
                    <div className="flex justify-between">
                      <span style={{ color: "var(--text-secondary)" }}>
                        End Date:
                      </span>
                      <span style={{ color: "var(--text-primary)" }}>
                        {endDate}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span style={{ color: "var(--text-secondary)" }}>
                      Calling Hours:
                    </span>
                    <span style={{ color: "var(--text-primary)" }}>
                      {callingStartTime} - {callingEndTime}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: "var(--text-secondary)" }}>
                      Max Calls/Day:
                    </span>
                    <span style={{ color: "var(--text-primary)" }}>
                      {maxCallsPerDay}
                    </span>
                  </div>
                </div>
              </div>

              <div
                className="rounded-lg p-4 border"
                style={{
                  backgroundColor: "var(--bg-hover)",
                  borderColor: "var(--border-default)",
                }}
              >
                <div className="flex items-start gap-3">
                  <Calendar
                    className="w-5 h-5 mt-0.5 flex-shrink-0"
                    style={{ color: "var(--accent-primary)" }}
                  />
                  <div>
                    <p
                      className="text-sm font-semibold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      Estimated Completion Time
                    </p>
                    <p
                      className="text-sm"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {estimatedCompletionTime}
                    </p>
                  </div>
                </div>
              </div>

              <div
                className="rounded-lg p-4 border border-yellow-400 bg-yellow-400/10"
              >
                <p
                  className="text-sm"
                  style={{ color: "var(--text-primary)" }}
                >
                  Review all settings carefully before launching. You can edit campaign
                  settings after creation.
                </p>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-3 mt-8 pt-6 border-t" style={{ borderColor: "var(--border-default)" }}>
            <button
              onClick={handleBack}
              disabled={currentStepIndex === 0}
              className="flex-1 px-4 py-2 rounded-lg border font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: "var(--bg-hover)",
                borderColor: "var(--border-default)",
                color: "var(--text-primary)",
              }}
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>

            {currentStep !== "review" ? (
              <button
                onClick={handleNext}
                disabled={!canAdvance()}
                className="flex-1 px-4 py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-white"
                style={{
                  backgroundColor: canAdvance()
                    ? "var(--accent-primary)"
                    : "var(--bg-hover)",
                }}
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleLaunch}
                disabled={isLoading}
                className="flex-1 px-4 py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-white"
                style={{
                  backgroundColor: "var(--accent-primary)",
                }}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Executing...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Execute Campaign
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
