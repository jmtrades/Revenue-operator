/**
 * After-hours utilities for voice agent system prompt.
 * Determines if business is currently open and builds appropriate context.
 */

type BusinessHours = {
  [day: string]: { start: string; end: string } | null;
};

const DAY_NAMES = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

/**
 * Check if the business is currently open based on business_hours and current time.
 * Returns true if open, false if closed, null if no business hours configured.
 */
export function isCurrentlyOpen(
  businessHours: BusinessHours | null,
  timezone: string = "America/New_York"
): boolean | null {
  if (!businessHours || Object.keys(businessHours).length === 0) {
    return null; // Not configured
  }

  try {
    // Get current time in workspace timezone
    const now = new Date();
    const timeInZone = new Date(
      now.toLocaleString("en-US", { timeZone: timezone })
    );

    const currentDayIndex = timeInZone.getDay();
    const currentDayName = DAY_NAMES[currentDayIndex];

    const dayHours = businessHours[currentDayName];
    if (!dayHours) {
      return false; // Closed today
    }

    const currentMinutes = timeInZone.getHours() * 60 + timeInZone.getMinutes();
    const [startH, startM] = dayHours.start.split(":").map(Number);
    const [endH, endM] = dayHours.end.split(":").map(Number);

    if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) {
      return null; // Invalid format
    }

    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  } catch (err) {
    console.error("[after-hours] Error checking business hours:", err);
    return null;
  }
}

/**
 * Build after-hours instructions based on behavior setting and emergency keywords.
 * Returns null if not currently after-hours or no after_hours_behavior set.
 */
export function buildAfterHoursInstructions(
  businessHours: BusinessHours | null,
  afterHoursBehavior: "messages" | "emergency" | "forward" | null,
  emergencyKeywords: string = "",
  transferPhone: string = "",
  timezone: string = "America/New_York"
): string | null {
  const isOpen = isCurrentlyOpen(businessHours, timezone);

  // Only inject after-hours instructions if currently closed
  if (isOpen === true || isOpen === null) {
    return null;
  }

  if (!afterHoursBehavior) {
    return null;
  }

  switch (afterHoursBehavior) {
    case "messages":
      return "You are currently operating after business hours. Take messages only — collect the caller's name, phone number, and reason for calling. Do not schedule appointments or make promises about callbacks.";

    case "emergency":
      const keywords = emergencyKeywords
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean)
        .join(", ");
      if (keywords) {
        return `You are currently operating after business hours. Only assist with emergencies. If the caller mentions any of these keywords: ${keywords}, connect them immediately. Otherwise, take a message.`;
      }
      return "You are currently operating after business hours. Only assist with emergencies. If the caller sounds urgent or mentions an emergency, connect them immediately. Otherwise, take a message.";

    case "forward":
      if (transferPhone) {
        return `You are currently operating after business hours. Transfer all calls to ${transferPhone}.`;
      }
      return "You are currently operating after business hours. Transfer calls to the on-call team.";

    default:
      return null;
  }
}
