/**
 * Reactivation message templates per angle.
 */

import type { ReactivationAngle } from "./engine";

const TEMPLATES: Record<ReactivationAngle, string> = {
  value: "Hi {{name}}, we've helped similar teams achieve {{outcome}}. Thought you might find it relevant.",
  clarification: "Hey {{name}}, wanted to check in — did you have a chance to look at this? Happy to clarify anything.",
  proof: "{{name}}, here's a quick case study from a company like yours: {{proof_snippet}}. Worth a look?",
  urgency: "{{name}}, we're seeing strong results with teams in your space. Would a 15-min call this week work?",
  closure: "{{name}}, we'll assume timing isn't right. Reach out anytime if that changes. Best wishes.",
};

export function getReactivationMessage(angle: ReactivationAngle, context: { name?: string; company?: string }): string {
  let msg = TEMPLATES[angle] ?? TEMPLATES.value;
  msg = msg.replace(/\{\{name\}\}/g, context.name ?? "there");
  msg = msg.replace(/\{\{outcome\}\}/g, "better outcomes");
  msg = msg.replace(/\{\{proof_snippet\}\}/g, "notable results");
  return msg;
}
