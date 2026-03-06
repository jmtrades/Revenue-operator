export function getGoogleCalendarClientId(): string | null {
  const value =
    process.env.GOOGLE_CALENDAR_CLIENT_ID ??
    process.env.GOOGLE_CLIENT_ID ??
    process.env.GOOGLE_OAUTH_CLIENT_ID ??
    "";
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function getGoogleCalendarClientSecret(): string | null {
  const value =
    process.env.GOOGLE_CALENDAR_CLIENT_SECRET ??
    process.env.GOOGLE_CLIENT_SECRET ??
    process.env.GOOGLE_OAUTH_CLIENT_SECRET ??
    "";
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
