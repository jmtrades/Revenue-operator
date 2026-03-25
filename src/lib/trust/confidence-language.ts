/**
 * Action confidence language: confident / monitoring / low probability
 */

export type ConfidenceLabel = "confident" | "monitoring" | "low_probability";

export function confidenceToLabel(score: number): ConfidenceLabel {
  if (score >= 0.8) return "confident";
  if (score >= 0.5) return "monitoring";
  return "low_probability";
}

export function confidenceLabelHuman(label: ConfidenceLabel): string {
  const map: Record<ConfidenceLabel, string> = {
    confident: "Confident",
    monitoring: "Watching over",
    low_probability: "Low probability",
  };
  return map[label] ?? "Watching over";
}
