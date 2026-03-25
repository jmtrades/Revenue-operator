"use client";

import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { useTranslations } from "next-intl";
import { tokens } from "@/lib/design-tokens";

type OutcomeSlice = {
  name: string;
  value: number;
  color: string;
};

type AnalyticsChartsProps = {
  volumeData: { day: string; calls: number }[];
  outcomeSlices: OutcomeSlice[];
};

/** Read CSS custom properties at runtime so charts respect light/dark mode. */
function useChartColors() {
  const fallbackAccent = tokens.colors.accentPrimary;
  const [colors, setColors] = useState({
    tickFill: "#71757E",
    tooltipBg: "#FFFFFF",
    tooltipBorder: "rgba(0,0,0,0.08)",
    tooltipLabel: "#4B5563",
    accent: fallbackAccent as string,
    legendText: "#71757E",
  });

  useEffect(() => {
    const cs = getComputedStyle(document.documentElement);
    setColors({
      tickFill: cs.getPropertyValue("--text-tertiary").trim() || "#71757E",
      tooltipBg: cs.getPropertyValue("--bg-surface").trim() || "#FFFFFF",
      tooltipBorder: cs.getPropertyValue("--border-default").trim() || "rgba(0,0,0,0.08)",
      tooltipLabel: cs.getPropertyValue("--text-secondary").trim() || "#4B5563",
      accent: cs.getPropertyValue("--accent-primary").trim() || fallbackAccent,
      legendText: cs.getPropertyValue("--text-tertiary").trim() || "#71757E",
    });
  }, []);

  return colors;
}

export function AnalyticsCharts({ volumeData, outcomeSlices }: AnalyticsChartsProps) {
  const t = useTranslations("analytics");
  const cc = useChartColors();

  return (
    <>
      {/* Row 2: charts */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] mb-6">
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 md:p-5">
          <p className="text-sm font-medium text-[var(--text-primary)] mb-4">
            {t("charts.callVolumeTitle")}
          </p>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={volumeData}>
                <defs>
                  <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={cc.accent} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={cc.accent} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 11, fill: cc.tickFill }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: cc.tickFill }}
                  axisLine={false}
                  tickLine={false}
                  width={32}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: cc.tooltipBg,
                    borderRadius: 8,
                    border: `1px solid ${cc.tooltipBorder}`,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: cc.tooltipLabel }}
                />
                <Area
                  type="monotone"
                  dataKey="calls"
                  stroke={cc.accent}
                  strokeWidth={2}
                  fill="url(#volumeGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 md:p-5">
          <p className="text-sm font-medium text-[var(--text-primary)] mb-4">
            {t("charts.outcomeBreakdown")}
          </p>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={outcomeSlices}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={72}
                  paddingAngle={4}
                >
                  {outcomeSlices.map((slice) => (
                    <Cell key={slice.name} fill={slice.color} />
                  ))}
                </Pie>
                <Legend
                  layout="vertical"
                  align="right"
                  verticalAlign="middle"
                  iconSize={8}
                  formatter={(value) => (
                    <span style={{ color: cc.legendText, fontSize: 11 }}>{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </>
  );
}

