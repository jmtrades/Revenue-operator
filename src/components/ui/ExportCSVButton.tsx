"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "./Button";

interface ExportCSVButtonProps {
  data: Record<string, unknown>[];
  filename: string;
  columns?: Array<{ key: string; label: string }>;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
}

export function ExportCSVButton({
  data,
  filename,
  columns,
  variant = "secondary",
  size = "md",
  disabled = false,
}: ExportCSVButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const exportToCSV = () => {
    if (!data || data.length === 0) return;

    setIsExporting(true);

    try {
      // Determine headers and keys
      const headers = columns ? columns.map((c) => c.label) : Object.keys(data[0] || {});
      const keys = columns ? columns.map((c) => c.key) : Object.keys(data[0] || {});

      // Helper to safely quote CSV values
      const escapeCsvValue = (value: unknown): string => {
        if (value == null) return "";
        const str = String(value);
        // Escape quotes and newlines, then wrap in quotes if needed
        const escaped = str.replace(/"/g, '""').replace(/\r?\n/g, " ");
        // Only quote if contains comma, quote, or newline
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return `"${escaped}"`;
        }
        return escaped;
      };

      // Build CSV lines
      const csvLines = [
        headers.join(","),
        ...data.map((row) =>
          keys.map((key) => escapeCsvValue(row[key])).join(",")
        ),
      ].join("\n");

      // Create blob and download
      const blob = new Blob([csvLines], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);

      link.setAttribute("href", url);
      link.setAttribute("download", `${filename}.csv`);
      link.style.visibility = "hidden";

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      disabled={disabled || isExporting || data.length === 0}
      loading={isExporting}
      icon={Download}
      onClick={exportToCSV}
    >
      {isExporting ? "Exporting..." : "Export CSV"}
    </Button>
  );
}
