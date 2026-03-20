"use client";

import React, { useState, useEffect } from "react";
import { Users, Building2, Phone, BarChart3 } from "lucide-react";

interface ExportRequest {
  id: string;
  data_type: string;
  status: string;
  created_at: string;
  file_size?: string;
}

function ExportButton({ label, dataType, icon }: { label: string; dataType: string; icon: React.ReactNode }) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await fetch(`/api/admin/export/${dataType}`, {
        credentials: "include",
      });

      if (!response.ok) throw new Error("Export failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `export_${dataType}_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert("Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={exporting}
      className="flex flex-col items-center gap-3 p-6 rounded-lg border transition-colors hover:opacity-80 disabled:opacity-50"
      style={{
        borderColor: "var(--border-default)",
        background: "var(--bg-surface)",
        color: "var(--text-primary)",
      }}
    >
      <span>{icon}</span>
      <p className="font-medium text-sm">{label}</p>
      <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
        {exporting ? "Exporting…" : "Download CSV"}
      </p>
    </button>
  );
}

interface ExportHistory {
  id: string;
  data_type: string;
  status: string;
  created_at: string;
  file_size?: number;
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return "N/A";
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

function formatRelativeTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} day${days > 1 ? "s" : ""} ago`;
    const weeks = Math.floor(days / 7);
    if (weeks < 4) return `${weeks} week${weeks > 1 ? "s" : ""} ago`;
    const months = Math.floor(days / 30);
    return `${months} month${months > 1 ? "s" : ""} ago`;
  } catch {
    return "unknown";
  }
}

export default function ExportPage() {
  const [exports, setExports] = useState<ExportHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExports = async () => {
      try {
        const response = await fetch("/api/admin/stats", {
          credentials: "include",
        });
        if (response.ok) {
          const data = await response.json();
          setExports(data.recent_exports || []);
        }
      } catch (err) {
        console.error("Failed to fetch export history:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchExports();
  }, []);

  return (
    <div className="max-w-7xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Data Export</h1>
        <p style={{ color: "var(--text-secondary)" }} className="text-sm mt-1">
          Export platform data for analysis and reporting
        </p>
      </div>

      {/* Export Options */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Export Data</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <ExportButton label="Users" dataType="signups" icon={<Users size={28} />} />
          <ExportButton label="Workspaces" dataType="businesses" icon={<Building2 size={28} />} />
          <ExportButton label="Calls" dataType="calls" icon={<Phone size={28} />} />
          <ExportButton label="Full JSON" dataType="all" icon={<BarChart3 size={28} />} />
        </div>
      </section>

      {/* Export Information */}
      <section>
        <h2 className="text-lg font-semibold mb-4">About Exports</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            className="rounded-lg border p-6"
            style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}
          >
            <h3 className="font-medium mb-3">CSV Format</h3>
            <ul className="space-y-2 text-sm" style={{ color: "var(--text-secondary)" }}>
              <li>• Comma-separated values</li>
              <li>• UTF-8 encoding</li>
              <li>• Quoted fields with special chars</li>
              <li>• Compatible with Excel, Google Sheets</li>
              <li>• Ready for data analysis tools</li>
            </ul>
          </div>

          <div
            className="rounded-lg border p-6"
            style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}
          >
            <h3 className="font-medium mb-3">Data Included</h3>
            <ul className="space-y-2 text-sm" style={{ color: "var(--text-secondary)" }}>
              <li>• All non-sensitive fields</li>
              <li>• Full historical data</li>
              <li>• Last 90 days for call logs</li>
              <li>• Anonymized where applicable</li>
              <li>• Updated hourly</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Recent Exports */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Recent Exports</h2>
        {loading ? (
          <div
            className="rounded-lg border p-8 text-center"
            style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}
          >
            <p style={{ color: "var(--text-tertiary)" }}>Loading export history...</p>
          </div>
        ) : exports.length === 0 ? (
          <div
            className="rounded-lg border p-8 text-center"
            style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}
          >
            <p style={{ color: "var(--text-secondary)" }}>No exports yet</p>
            <p style={{ color: "var(--text-tertiary)" }} className="text-sm mt-1">
              Start an export from the "Export Data" section above to see your history here.
            </p>
          </div>
        ) : (
          <div
            className="rounded-lg border overflow-hidden"
            style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}
          >
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: "var(--border-default)", background: "var(--bg-primary)" }}>
                  <th className="p-3 text-left font-medium">Data Type</th>
                  <th className="p-3 text-left font-medium">Status</th>
                  <th className="p-3 text-left font-medium">Size</th>
                  <th className="p-3 text-left font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {exports.map((item, i) => (
                  <tr
                    key={item.id}
                    className="border-b hover:opacity-80 transition-opacity"
                    style={{
                      borderColor: "var(--border-default)",
                      background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)",
                    }}
                  >
                    <td className="p-3 font-medium" style={{ color: "var(--text-primary)" }}>
                      {item.data_type}
                    </td>
                    <td className="p-3">
                      <span
                        className="px-2 py-1 rounded text-xs font-medium"
                        style={{
                          background: item.status === "completed" ? "rgba(34, 197, 94, 0.1)" : "rgba(59, 130, 246, 0.1)",
                          color: item.status === "completed" ? "var(--meaning-green)" : "var(--accent-blue)",
                        }}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="p-3 text-xs" style={{ color: "var(--text-tertiary)" }}>
                      {formatFileSize(item.file_size)}
                    </td>
                    <td className="p-3 text-xs" style={{ color: "var(--text-tertiary)" }}>
                      {formatRelativeTime(item.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Data Marketplace */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Data Marketplace</h2>
        <div
          className="rounded-lg border p-8 text-center"
          style={{ borderColor: "var(--border-default)", background: "var(--accent-primary-subtle)" }}
        >
          <p className="text-xl font-semibold" style={{ color: "var(--accent-primary)" }}>
            Anonymized Industry Benchmarks
          </p>
          <p style={{ color: "var(--text-secondary)" }} className="mt-2">
            Purchase deep-dive benchmark reports, cohort analysis, and competitive intelligence data generated from
            aggregated platform metrics.
          </p>

          <div className="mt-6 rounded-lg border p-6" style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}>
            <p className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
              Custom Pricing
            </p>
            <p style={{ color: "var(--text-secondary)" }} className="mt-2">
              All benchmark packages include quarterly reports, cohort analysis, and competitive intelligence reports tailored to your needs.
            </p>
            <p style={{ color: "var(--text-tertiary)" }} className="mt-3 text-sm">
              Contact our sales team for personalized pricing and implementation.
            </p>
            <button
              className="mt-4 px-6 py-2 rounded-lg font-medium text-sm transition-colors"
              style={{
                background: "var(--accent-primary)",
                color: "white",
              }}
              onClick={() => {
                window.location.href = "mailto:sales@example.com?subject=Data%20Marketplace%20Inquiry";
              }}
            >
              Contact Sales
            </button>
          </div>

          <p className="text-xs mt-4" style={{ color: "var(--text-tertiary)" }}>
            All benchmark data is anonymized and aggregated. No individual customer data is included.
          </p>
        </div>
      </section>

      {/* API Access */}
      <section>
        <h2 className="text-lg font-semibold mb-4">API Access (Coming Soon)</h2>
        <div
          className="rounded-lg border p-6"
          style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}
        >
          <p style={{ color: "var(--text-secondary)" }} className="mb-4">
            Programmatic access to export endpoints with webhooks and scheduled exports.
          </p>

          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span style={{ color: "var(--text-tertiary)" }}>•</span>
              <p style={{ color: "var(--text-secondary)" }}>REST API endpoints for all data types</p>
            </div>
            <div className="flex items-center gap-2">
              <span style={{ color: "var(--text-tertiary)" }}>•</span>
              <p style={{ color: "var(--text-secondary)" }}>Webhook notifications on export completion</p>
            </div>
            <div className="flex items-center gap-2">
              <span style={{ color: "var(--text-tertiary)" }}>•</span>
              <p style={{ color: "var(--text-secondary)" }}>Scheduled exports (daily, weekly, monthly)</p>
            </div>
            <div className="flex items-center gap-2">
              <span style={{ color: "var(--text-tertiary)" }}>•</span>
              <p style={{ color: "var(--text-secondary)" }}>S3/Cloud Storage integration</p>
            </div>
            <div className="flex items-center gap-2">
              <span style={{ color: "var(--text-tertiary)" }}>•</span>
              <p style={{ color: "var(--text-secondary)" }}>Data retention policies</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
