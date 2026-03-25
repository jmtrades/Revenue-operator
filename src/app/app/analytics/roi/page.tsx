"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  Clock,
  Sparkles,
  AlertTriangle,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
} from "lucide-react";
import { useWorkspace } from "@/components/WorkspaceContext";
import { getWorkspaceMeSnapshotSync } from "@/lib/client/workspace-me";
import { apiFetch } from "@/lib/api";
import { formatCurrency } from "@/lib/currency";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

// Dynamically import recharts components for client-side rendering
const LineChart = dynamic(
  () => import("recharts").then((m) => m.LineChart),
  { ssr: false }
);
const BarChart = dynamic(
  () => import("recharts").then((m) => m.BarChart),
  { ssr: false }
);
const Line = dynamic(
  () => import("recharts").then((m) => m.Line),
  { ssr: false }
);
const Bar = dynamic(
  () => import("recharts").then((m) => m.Bar),
  { ssr: false }
);
const XAxis = dynamic(
  () => import("recharts").then((m) => m.XAxis),
  { ssr: false }
);
const YAxis = dynamic(
  () => import("recharts").then((m) => m.YAxis),
  { ssr: false }
);
const CartesianGrid = dynamic(
  () => import("recharts").then((m) => m.CartesianGrid),
  { ssr: false }
);
const Tooltip = dynamic(
  () => import("recharts").then((m) => m.Tooltip),
  { ssr: false }
);
const Legend = dynamic(
  () => import("recharts").then((m) => m.Legend),
  { ssr: false }
);
const ResponsiveContainer = dynamic(
  () => import("recharts").then((m) => m.ResponsiveContainer),
  { ssr: false }
);

type DateRange = "7d" | "30d" | "90d";

interface ROIData {
  total_revenue: number;
  total_cost: number;
  roi_percentage: number;
  time_saved_hours: number;
  cost_per_lead: number;
  cost_per_appointment: number;
  cost_per_conversion: number;
  revenue_per_call: number;
  monthly_trends: Array<{
    month: string;
    revenue: number;
    cost: number;
    roi: number;
  }>;
  leads_by_source: Array<{
    source: string;
    revenue: number;
    count: number;
  }>;
}

interface PredictionData {
  predicted_conversions_30d: number;
  predicted_conversions_confidence: number;
  predicted_revenue_30d: number;
  predicted_revenue_confidence: number;
  churn_risk_leads: Array<{
    id: string;
    name: string;
    email: string;
    risk_score: number;
    last_activity: string;
  }>;
  growth_opportunities: Array<{
    id: string;
    type: string;
    title: string;
    estimated_impact: number;
    priority: "high" | "medium" | "low";
    description: string;
  }>;
}

interface ChartDataPoint {
  month?: string;
  day?: string;
  revenue?: number;
  cost?: number;
  roi?: number;
  source?: string;
  value?: number;
}

function LoadingState() {
  return (
    <div className="space-y-6">
      <Skeleton variant="card" className="h-20" />
      <div className="grid md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} variant="card" className="h-32" />
        ))}
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <Skeleton variant="card" className="h-80" />
        <Skeleton variant="card" className="h-80" />
      </div>
    </div>
  );
}

function TrendBadge({ value, isPositive }: { value: number; isPositive: boolean }) {
  return (
    <div className={`flex items-center gap-1 text-xs font-medium ${isPositive ? "text-emerald-500" : "text-red-500"}`}>
      {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
      {Math.abs(value).toFixed(1)}%
    </div>
  );
}

function KPICard({
  label,
  value,
  unit,
  icon: Icon,
  trend,
  isTrend,
  subtext,
}: {
  label: string;
  value: string | number;
  unit?: string;
  icon: React.ReactNode;
  trend?: number;
  isTrend?: boolean;
  subtext?: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6">
      <div className="flex items-start justify-between mb-2">
        <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">{label}</p>
        <div className="text-[var(--text-tertiary)]">{Icon}</div>
      </div>
      <div className="flex items-baseline gap-2">
        <p className="text-3xl font-bold text-[var(--text-primary)]">{value}</p>
        {unit && <span className="text-sm text-[var(--text-secondary)]">{unit}</span>}
      </div>
      <div className="flex items-center justify-between mt-4">
        {subtext && <p className="text-xs text-[var(--text-tertiary)]">{subtext}</p>}
        {isTrend && trend !== undefined && (
          <TrendBadge value={trend} isPositive={trend >= 0} />
        )}
      </div>
    </div>
  );
}

function CostMetricsRow({ data }: { data: ROIData | null }) {
  if (!data) return null;

  const metrics = [
    {
      label: "Cost per Lead",
      value: formatCurrency(data.cost_per_lead, "USD", "en"),
      icon: <Target size={18} />,
    },
    {
      label: "Cost per Appointment",
      value: formatCurrency(data.cost_per_appointment, "USD", "en"),
      icon: <Calendar size={18} />,
    },
    {
      label: "Cost per Conversion",
      value: formatCurrency(data.cost_per_conversion, "USD", "en"),
      icon: <Zap size={18} />,
    },
    {
      label: "Revenue per Call",
      value: formatCurrency(data.revenue_per_call, "USD", "en"),
      icon: <DollarSign size={18} />,
    },
  ];

  return (
    <div className="grid md:grid-cols-4 gap-4 mb-6">
      {metrics.map((metric) => (
        <div key={metric.label} className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4">
          <div className="flex items-center gap-2 mb-2">
            <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">{metric.label}</p>
            <div className="text-[var(--text-tertiary)]">{metric.icon}</div>
          </div>
          <p className="text-2xl font-bold text-[var(--text-primary)]">{metric.value}</p>
        </div>
      ))}
    </div>
  );
}

function MonthlyTrendChart({ data }: { data: ChartDataPoint[] }) {
  return (
    <Card variant="elevated">
      <CardHeader>Revenue vs Cost & ROI Trend</CardHeader>
      <CardBody>
        <div style={{ width: "100%", height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" />
              <XAxis dataKey="month" stroke="var(--text-tertiary)" style={{ fontSize: 12 }} />
              <YAxis stroke="var(--text-tertiary)" style={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--bg-card)",
                  border: "1px solid var(--border-default)",
                  borderRadius: "8px",
                  color: "var(--text-primary)",
                }}
              />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} name="Revenue" />
              <Line type="monotone" dataKey="cost" stroke="#f87171" strokeWidth={2} name="Cost" />
              <Line type="monotone" dataKey="roi" stroke="#3b82f6" strokeWidth={2} name="ROI %" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardBody>
    </Card>
  );
}

function LeadsBySourceChart({ data }: { data: ChartDataPoint[] }) {
  return (
    <Card variant="elevated">
      <CardHeader>Lead Revenue by Source</CardHeader>
      <CardBody>
        <div style={{ width: "100%", height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={data} margin={{ top: 5, right: 30, left: 120, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" />
              <XAxis type="number" stroke="var(--text-tertiary)" style={{ fontSize: 12 }} />
              <YAxis dataKey="source" type="category" stroke="var(--text-tertiary)" style={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--bg-card)",
                  border: "1px solid var(--border-default)",
                  borderRadius: "8px",
                  color: "var(--text-primary)",
                }}
              />
              <Bar dataKey="value" fill="#8b5cf6" name="Revenue" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardBody>
    </Card>
  );
}

function PredictionsSection({ data }: { data: PredictionData | null }) {
  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* AI Predictions KPIs */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-[var(--border-default)] bg-gradient-to-br from-[var(--bg-card)] to-blue-500/5 p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                Predicted Conversions (30d)
              </p>
              <p className="text-4xl font-bold text-[var(--text-primary)]">
                {Math.round(data.predicted_conversions_30d)}
              </p>
            </div>
            <Sparkles className="text-blue-500" size={24} />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 bg-[var(--border-default)] rounded-full flex-1 overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full"
                style={{ width: `${data.predicted_conversions_confidence}%` }}
              />
            </div>
            <span className="text-xs font-medium text-[var(--text-secondary)]">
              {Math.round(data.predicted_conversions_confidence)}% confidence
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--border-default)] bg-gradient-to-br from-[var(--bg-card)] to-emerald-500/5 p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                Predicted Revenue (30d)
              </p>
              <p className="text-4xl font-bold text-[var(--text-primary)]">
                {formatCurrency(data.predicted_revenue_30d, "USD", "en")}
              </p>
            </div>
            <TrendingUp className="text-emerald-500" size={24} />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 bg-[var(--border-default)] rounded-full flex-1 overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full"
                style={{ width: `${data.predicted_revenue_confidence}%` }}
              />
            </div>
            <span className="text-xs font-medium text-[var(--text-secondary)]">
              {Math.round(data.predicted_revenue_confidence)}% confidence
            </span>
          </div>
        </div>
      </div>

      {/* Churn Risk Leads */}
      {data.churn_risk_leads && data.churn_risk_leads.length > 0 && (
        <Card variant="elevated">
          <CardHeader className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-500" />
            At-Risk Leads ({data.churn_risk_leads.length})
          </CardHeader>
          <CardBody>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-default)]">
                    <th className="text-left py-3 px-4 font-semibold text-[var(--text-secondary)]">Lead Name</th>
                    <th className="text-left py-3 px-4 font-semibold text-[var(--text-secondary)]">Email</th>
                    <th className="text-left py-3 px-4 font-semibold text-[var(--text-secondary)]">Risk Score</th>
                    <th className="text-left py-3 px-4 font-semibold text-[var(--text-secondary)]">Last Activity</th>
                  </tr>
                </thead>
                <tbody>
                  {data.churn_risk_leads.slice(0, 10).map((lead) => (
                    <tr key={lead.id} className="border-b border-[var(--border-default)] hover:bg-[var(--bg-hover)]">
                      <td className="py-3 px-4 text-[var(--text-primary)]">{lead.name}</td>
                      <td className="py-3 px-4 text-[var(--text-secondary)]">{lead.email}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{
                            backgroundColor:
                              lead.risk_score >= 75
                                ? "#ef4444"
                                : lead.risk_score >= 50
                                ? "#f59e0b"
                                : "#10b981",
                          }} />
                          <span className="font-medium text-[var(--text-primary)]">
                            {Math.round(lead.risk_score)}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-[var(--text-tertiary)] text-xs">
                        {new Date(lead.last_activity).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Growth Opportunities */}
      {data.growth_opportunities && data.growth_opportunities.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <Zap size={20} className="text-amber-500" />
            Growth Opportunities
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.growth_opportunities.map((opp) => (
              <Card key={opp.id} variant="interactive">
                <CardBody>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-semibold text-[var(--text-primary)]">{opp.title}</h4>
                      <p className="text-xs text-[var(--text-tertiary)] mt-1">{opp.description}</p>
                    </div>
                    {opp.priority === "high" && (
                      <Badge variant="error" className="ml-2 shrink-0">
                        High
                      </Badge>
                    )}
                    {opp.priority === "medium" && (
                      <Badge variant="warning" className="ml-2 shrink-0">
                        Medium
                      </Badge>
                    )}
                    {opp.priority === "low" && (
                      <Badge variant="success" className="ml-2 shrink-0">
                        Low
                      </Badge>
                    )}
                  </div>
                  <div className="pt-3 border-t border-[var(--border-default)]">
                    <p className="text-xs text-[var(--text-secondary)]">Estimated Impact</p>
                    <p className="text-lg font-bold text-emerald-500 mt-1">
                      +{formatCurrency(opp.estimated_impact, "USD", "en")}
                    </p>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ROIPage() {
  const { workspaceId } = useWorkspace();
  const [dateRange, setDateRange] = useState<DateRange>("30d");
  const [roiData, setROIData] = useState<ROIData | null>(null);
  const [predictionData, setPredictionData] = useState<PredictionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const workspaceSnapshot = useMemo(() => {
    return getWorkspaceMeSnapshotSync();
  }, []);

  const locale = (workspaceSnapshot?.locale as string) || "en";
  const currency = (workspaceSnapshot?.currency as string) || "USD";

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [roiDataJson, predictionDataJson] = await Promise.all([
          apiFetch<ROIData>(`/api/analytics/roi?range=${dateRange}`),
          apiFetch<PredictionData>("/api/analytics/predictions"),
        ]);

        setROIData(roiDataJson);
        setPredictionData(predictionDataJson);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load analytics");
      } finally {
        setLoading(false);
      }
    };

    if (workspaceId) {
      fetchData();
    }
  }, [workspaceId, dateRange]);

  const chartData = useMemo(() => {
    return roiData?.monthly_trends.map((trend) => ({
      month: trend.month,
      revenue: trend.revenue,
      cost: trend.cost,
      roi: trend.roi,
    })) || [];
  }, [roiData]);

  const leadSourceData = useMemo(() => {
    return (
      roiData?.leads_by_source.map((source) => ({
        source: source.source,
        value: source.revenue,
      })) || []
    );
  }, [roiData]);

  if (!workspaceId) {
    return <EmptyState title="Not found" description="Workspace not found" />;
  }

  if (error && !loading) {
    return (
      <EmptyState
        title="Unable to load ROI data"
        description={error}
        icon={AlertCircle}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-[var(--text-primary)] flex items-center gap-3 mb-2">
                <Sparkles size={32} className="text-blue-500" />
                ROI & Revenue Intelligence
              </h1>
              <p className="text-[var(--text-secondary)]">Track your AI platform's impact on revenue and efficiency</p>
            </div>
            <div className="mt-4 md:mt-0 flex gap-2">
              {(["7d", "30d", "90d"] as DateRange[]).map((range) => (
                <button
                  key={range}
                  onClick={() => setDateRange(range)}
                  className={`px-4 py-2 rounded-lg font-medium transition-[background-color,border-color,color,transform] ${
                    dateRange === range
                      ? "bg-blue-500 text-white"
                      : "bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border-default)] hover:border-blue-500"
                  }`}
                >
                  {range === "7d" ? "7 Days" : range === "30d" ? "30 Days" : "90 Days"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <LoadingState />
        ) : roiData ? (
          <div className="space-y-8">
            {/* Hero KPIs */}
            <div className="grid md:grid-cols-4 gap-4">
              <KPICard
                label="Total Revenue"
                value={formatCurrency(roiData.total_revenue, currency, locale)}
                icon={<DollarSign size={20} />}
                subtext={`${roiData.leads_by_source.reduce((acc, s) => acc + s.count, 0)} leads generated`}
              />
              <KPICard
                label="Total Cost"
                value={formatCurrency(roiData.total_cost, currency, locale)}
                icon={<Target size={20} />}
                subtext="Operations & infrastructure"
              />
              <KPICard
                label="ROI %"
                value={roiData.roi_percentage.toFixed(1)}
                unit="%"
                icon={<TrendingUp size={20} className="text-emerald-500" />}
                subtext="Return on investment"
              />
              <KPICard
                label="Time Saved"
                value={roiData.time_saved_hours.toFixed(0)}
                unit="hrs"
                icon={<Clock size={20} className="text-blue-500" />}
                subtext="Manual work eliminated"
              />
            </div>

            {/* Cost Metrics Row */}
            <CostMetricsRow data={roiData} />

            {/* Charts */}
            <div className="grid md:grid-cols-2 gap-6">
              {chartData.length > 0 && <MonthlyTrendChart data={chartData} />}
              {leadSourceData.length > 0 && <LeadsBySourceChart data={leadSourceData} />}
            </div>

            {/* AI Predictions */}
            <PredictionsSection data={predictionData} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
