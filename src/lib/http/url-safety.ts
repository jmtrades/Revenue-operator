/**
 * URL safety utilities — prevents SSRF by blocking requests to internal/private IPs.
 */

/**
 * Returns true if the URL is a valid, publicly-accessible HTTP(S) endpoint.
 * Blocks: localhost, private IPs (10.x, 172.x, 192.168.x), link-local, IPv6 internal.
 */
export function isSafeExternalUrl(raw: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return false;
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    return false;
  }

  const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");

  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname === "::" ||
    hostname === "0.0.0.0" ||
    hostname.startsWith("10.") ||
    hostname.startsWith("172.") ||
    hostname.startsWith("192.168.") ||
    hostname.startsWith("fc") ||
    hostname.startsWith("fd") ||
    hostname.startsWith("fe80") ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".local") ||
    /^169\.254\./.test(hostname) ||
    /^0+:0+:0+:0+:0+:(?:0+|ffff):/.test(hostname)
  ) {
    return false;
  }

  return true;
}
