"use client";

import { useState } from "react";

interface Benchmark {
  metric: string;
  platform_avg: string;
  industry_avg: string;
  percentile: string;
}

function BenchmarkComparison({ metric, platformVal, industryVal, percentile }: { metric: string; platformVal: string; industryVal: string; percentile: string }) {
  const isWinning = percentile.startsWith("Top");
  return (
    <tr
      className="border-b"
      style={{
        borderColor: "var(--border-default)",
        background: isWinning ? "rgba(34, 197, 94, 0.05)" : "transparent",
      }}
    >
      <td className="p-3 font-medium" style={{ color: "var(--text-primary)" }}>
        {metric}
      </td>
      <td className="p-3" style={{ color: "var(--accent-primary)" }}>
        {platformVal}
      </td>
      <td className="p-3" style={{ color: "var(--text-secondary)" }}>
        {industryVal}
      </td>
      <td className="p-3 text-sm">
        <span
          style={{
            color: isWinning ? "var(--meaning-green)" : "var(--text-tertiary)",
            fontWeight: isWinning ? 600 : 400,
          }}
        >
          {percentile}
        </span>
      </td>
    </tr>
  );
}

export default function BenchmarksPage() {
  const [selectedIndustry, setSelectedIndustry] = useState("saas");

  const industries = {
    saas: {
      name: "SaaS",
      benchmarks: [
        { metric: "Average Contract Value", platform: "$8,920", industry: "$6,200", percentile: "Top 25%" },
        { metric: "Churn Rate (MRR)", platform: "2.1%", industry: "5.2%", percentile: "Top 10%" },
        { metric: "NRR (Net Revenue Retention)", platform: "127%", industry: "105%", percentile: "Top 15%" },
        { metric: "Sales Cycle Days", platform: "18d", industry: "35d", percentile: "Top 20%" },
        { metric: "Trial to Paid Conversion", platform: "18%", industry: "10%", percentile: "Top 5%" },
        { metric: "Customer Acquisition Cost", platform: "$1,240", industry: "$2,850", percentile: "Top 12%" },
        { metric: "LTV:CAC Ratio", platform: "5.8x", industry: "3.2x", percentile: "Top 8%" },
      ],
    },
    enterprise: {
      name: "Enterprise Software",
      benchmarks: [
        { metric: "Implementation Time", platform: "14d", industry: "45d", percentile: "Top 20%" },
        { metric: "Support Ticket Resolution", platform: "2.4h", industry: "8.1h", percentile: "Top 15%" },
        { metric: "System Uptime", platform: "99.94%", industry: "99.5%", percentile: "Top 10%" },
        { metric: "Feature Adoption", platform: "73%", industry: "55%", percentile: "Top 18%" },
        { metric: "API Response Time", platform: "145ms", industry: "320ms", percentile: "Top 12%" },
      ],
    },
    comms: {
      name: "Communications Platform",
      benchmarks: [
        { metric: "Call Completion Rate", platform: "94.2%", industry: "88.5%", percentile: "Top 15%" },
        { metric: "Average Call Duration", platform: "6.2m", industry: "5.8m", percentile: "Top 30%" },
        { metric: "Platform Latency", platform: "78ms", industry: "120ms", percentile: "Top 12%" },
        { metric: "Audio Quality Score", platform: "4.7/5", industry: "4.2/5", percentile: "Top 20%" },
        { metric: "Concurrent Call Capacity", platform: "50k+", industry: "15k", percentile: "Top 5%" },
      ],
    },
  };

  type IndustryKey = keyof typeof industries;
  const current = industries[selectedIndustry as IndustryKey] || industries.saas;

  return (
    <div className="max-w-7xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Benchmarks</h1>
        <p style={{ color: "var(--text-secondary)" }} className="text-sm mt-1">
          Compare your platform metrics against industry averages
        </p>
      </div>

      {/* Industry Selector */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(industries).map(([key, industry]) => (
          <button
            key={key}
            onClick={() => setSelectedIndustry(key)}
            className="px-4 py-2 rounded-lg text-sm font-medium border transition-colors"
            style={{
              borderColor: "var(--border-default)",
              background: selectedIndustry === key ? "var(--accent-primary-subtle)" : "transparent",
              color: selectedIndustry === key ? "var(--accent-primary)" : "var(--text-secondary)",
            }}
          >
            {industry.name}
          </button>
        ))}
      </div>

      {/* Benchmarks Table */}
      <div
        className="rounded-lg border overflow-hidden"
        style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b" style={{ borderColor: "var(--border-default)", background: "var(--bg-primary)" }}>
              <th className="p-3 text-left font-medium">Metric</th>
              <th className="p-3 text-left font-medium">Your Platform</th>
              <th className="p-3 text-left font-medium">Industry Avg</th>
              <th className="p-3 text-left font-medium">Percentile</th>
            </tr>
          </thead>
          <tbody>
            {current.benchmarks.map((bench, i) => (
              <BenchmarkComparison
                key={i}
                metric={bench.metric}
                platformVal={bench.platform}
                industryVal={bench.industry}
                percentile={bench.percentile}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend & Notes */}
      <section>
        <h2 className="text-lg font-semibold mb-4">How We Calculate Benchmarks</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div
            className="rounded-lg border p-6"
            style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}
          >
            <h3 className="font-medium mb-3">Methodology</h3>
            <ul className="space-y-2 text-sm" style={{ color: "var(--text-secondary)" }}>
              <li>• Aggregated from 500+ platform customers</li>
              <li>• Monthly data refresh cycle</li>
              <li>• Anonymized and normalized</li>
              <li>• Segmented by customer tier</li>
              <li>• Rolling 90-day averages</li>
            </ul>
          </div>

          <div
            className="rounded-lg border p-6"
            style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}
          >
            <h3 className="font-medium mb-3">Data Quality</h3>
            <ul className="space-y-2 text-sm" style={{ color: "var(--text-secondary)" }}>
              <li>• Benchmarks build over time</li>
              <li>• Require 30+ data points per metric</li>
              <li>• Updated monthly</li>
              <li>• Machine learning outlier detection</li>
              <li>• Confidence intervals calculated</li>
            </ul>
          </div>
        </div>
      </section>

    </div>
  );
}
