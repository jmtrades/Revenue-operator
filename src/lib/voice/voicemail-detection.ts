/**
 * Voicemail handling templates + behavior mapping for Recall voice.
 *
 * These templates are used in the agent settings UI (voicemail templates)
 * and in outbound call orchestration metadata.
 *
 * Vapi/ElevenLabs are intentionally not referenced here.
 */

export type VoicemailBehavior = "leave" | "hangup" | "sms";

export interface VoicemailDetectionConfig {
  provider: "recall" | "google" | "openai" | "twilio";
  type?: "audio" | "transcript";
  backoffPlan?: {
    startAtSeconds: number;
    frequencySeconds: number;
    maxRetries: number;
  };
  beepMaxAwaitSeconds?: number;
}

const DEFAULT_AMD: VoicemailDetectionConfig = {
  provider: "recall",
  type: "audio",
  backoffPlan: {
    startAtSeconds: 2,
    frequencySeconds: 2.5,
    maxRetries: 5,
  },
  beepMaxAwaitSeconds: 25,
};

/**
 * Default voicemail detection config for all outbound calls.
 * Used when behavior is "leave" or "hangup".
 */
export function getDefaultVoicemailDetectionConfig(): VoicemailDetectionConfig {
  return { ...DEFAULT_AMD };
}

/**
 * Voicemail drop templates for agent configuration (3–5 per use case).
 * Variables: {name}, {business}, {callback}, {service}, {date}
 */
export const VOICEMAIL_DROP_TEMPLATES = [
  {
    id: "follow_up",
    name: "Follow-up (general)",
    useCase: "Outbound follow-up after inquiry",
    message:
      "Hi {name}, this is calling from {business}. You reached out about {service} and we wanted to follow up. Please call us back at {callback} when you have a moment. Thanks!",
  },
  {
    id: "appointment_reminder",
    name: "Appointment reminder",
    useCase: "Reminder the day before",
    message:
      "Hi {name}, this is a reminder from {business} about your appointment on {date}. If you need to reschedule, please call {callback}. See you soon!",
  },
  {
    id: "lead_callback",
    name: "Lead callback",
    useCase: "Quick callback after form submit",
    message:
      "Hi {name}, this is {business}. Thanks for your interest — we’re calling to answer your questions. Reach us at {callback}. Have a great day!",
  },
  {
    id: "no_show_recovery",
    name: "No-show recovery",
    useCase: "After missed appointment",
    message:
      "Hi {name}, we missed you at {business} for your recent appointment. We’d love to reschedule at your convenience. Please call {callback}. Thank you!",
  },
  {
    id: "support_callback",
    name: "Support callback",
    useCase: "Returning a support request",
    message:
      "Hi {name}, this is {business} returning your call. We have an update on your request and would like to help. Please call us back at {callback}. Thank you!",
  },
] as const;

export type VoicemailTemplateId = (typeof VOICEMAIL_DROP_TEMPLATES)[number]["id"];

/**
 * Resolve a template message with optional variables (for display or pre-fill).
 */
export function resolveVoicemailTemplate(
  templateId: string,
  vars: { name?: string; business?: string; callback?: string; service?: string; date?: string } = {},
): string {
  const t = VOICEMAIL_DROP_TEMPLATES.find((x) => x.id === templateId);
  if (!t) return "";
  let msg: string = String(t.message);
  for (const [key, value] of Object.entries(vars)) {
    msg = msg.replace(new RegExp(`\\{${key}\\}`, "g"), value ?? `{${key}}`);
  }
  return msg;
}

export interface VoicemailConfigForAssistant {
  voicemailDetection: VoicemailDetectionConfig | null;
  voicemailMessage: string | null;
}

/**
 * When voicemail is detected: leave message, hang up, or (sms = hang up and rely on separate SMS flow).
 * - leave: enable detection and set voicemailMessage so Recall leaves the message
 * - hangup: enable detection but no message (or empty) so it hangs up quickly
 * - sms: enable detection, hang up (SMS flow handles the follow-up)
 */
export function getVoicemailConfigForBehavior(
  behavior: VoicemailBehavior,
  message?: string | null,
): VoicemailConfigForAssistant {
  const detection = getDefaultVoicemailDetectionConfig();

  switch (behavior) {
    case "leave":
      return {
        voicemailDetection: detection,
        voicemailMessage: (message ?? "").trim() || null,
      };
    case "hangup":
      return {
        voicemailDetection: detection,
        voicemailMessage: null,
      };
    case "sms":
      return {
        voicemailDetection: detection,
        voicemailMessage: null,
      };
    default:
      return {
        voicemailDetection: detection,
        voicemailMessage: (message ?? "").trim() || null,
      };
  }
}

