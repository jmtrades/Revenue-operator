/**
 * Alert thresholds configuration and checker
 * Monitors key operational metrics and triggers alerts when thresholds are exceeded
 */

export type AlertSeverity = "warning" | "critical";

export interface Alert {
  id: string;
  severity: AlertSeverity;
  message: string;
  metric: string;
  threshold: number;
  currentValue: number;
}

/**
 * Alert threshold definitions
 * Metrics should be provided as percentages (0-100) for rates
 * and milliseconds for durations
 */
export const ALERT_THRESHOLDS = {
  missed_call_rate: {
    threshold: 20, // %
    severity: "warning" as AlertSeverity,
    message: "Missed call rate exceeds 20%",
  },
  avg_response_time: {
    threshold: 30000, // ms (30 seconds)
    severity: "warning" as AlertSeverity,
    message: "Average response time exceeds 30 seconds",
  },
  no_show_rate: {
    threshold: 40, // %
    severity: "critical" as AlertSeverity,
    message: "No-show rate exceeds 40%",
  },
  api_error_rate: {
    threshold: 5, // %
    severity: "critical" as AlertSeverity,
    message: "API error rate exceeds 5%",
  },
  voice_preview_failure_rate: {
    threshold: 50, // %
    severity: "warning" as AlertSeverity,
    message: "Voice preview failure rate exceeds 50%",
  },
} as const;

/**
 * Check metrics against thresholds and return triggered alerts
 * @param metrics Object with metric names as keys and numeric values
 * @returns Array of triggered alerts sorted by severity (critical first)
 */
export function checkAlerts(metrics: Record<string, number>): Alert[] {
  const alerts: Alert[] = [];

  // Check each threshold
  for (const [metricName, config] of Object.entries(ALERT_THRESHOLDS)) {
    const currentValue = metrics[metricName];

    // Skip if metric not provided
    if (currentValue === null || currentValue === undefined || !Number.isFinite(currentValue)) {
      continue;
    }

    // Check if threshold is exceeded
    if (currentValue > config.threshold) {
      alerts.push({
        id: `alert:${metricName}:${Date.now()}`,
        severity: config.severity,
        message: config.message,
        metric: metricName,
        threshold: config.threshold,
        currentValue: Math.round(currentValue * 100) / 100, // Round to 2 decimals
      });
    }
  }

  // Sort by severity (critical first, then warning)
  alerts.sort((a, b) => {
    if (a.severity === "critical" && b.severity !== "critical") return -1;
    if (a.severity !== "critical" && b.severity === "critical") return 1;
    return 0;
  });

  return alerts;
}

/**
 * Format alerts for human-readable output
 */
export function formatAlert(alert: Alert): string {
  return `[${alert.severity.toUpperCase()}] ${alert.message} (current: ${alert.currentValue}, threshold: ${alert.threshold})`;
}

/**
 * Check if any critical alerts are present
 */
export function hasCriticalAlerts(alerts: Alert[]): boolean {
  return alerts.some((a) => a.severity === "critical");
}
