/**
 * Phase 16 — Email address validation.
 *
 * Pure module. No DNS, no network, no I/O. Validates syntax to a practical
 * subset of RFC 5322, flags role accounts, flags disposable domains, and
 * suggests fixes for common typos. Returns a structured risk score callers
 * can gate sends on.
 *
 * Why practical-RFC: the full RFC 5322 grammar allows addresses most MX
 * servers will refuse. We accept what is reliably deliverable and what every
 * major CRM accepts.
 */

/** Atom allowed in the local part before @. */
const LOCAL_ATOM = /^[A-Za-z0-9!#$%&'*+\-/=?^_`{|}~.]+$/;

/** Standard role-account prefixes (never a real person). */
export const ROLE_ACCOUNT_LOCAL_PARTS: ReadonlySet<string> = new Set([
  "abuse",
  "admin",
  "all",
  "billing",
  "careers",
  "compliance",
  "contact",
  "dev",
  "devs",
  "enquiries",
  "everyone",
  "feedback",
  "help",
  "hello",
  "hi",
  "hr",
  "info",
  "jobs",
  "legal",
  "mail",
  "marketing",
  "news",
  "newsletter",
  "no-reply",
  "noreply",
  "office",
  "orders",
  "postmaster",
  "press",
  "privacy",
  "recruiting",
  "root",
  "sales",
  "security",
  "service",
  "spam",
  "staff",
  "support",
  "sysadmin",
  "team",
  "webmaster",
]);

/** Well-known disposable / throwaway email domains. Non-exhaustive but catches the top offenders. */
export const DISPOSABLE_DOMAINS: ReadonlySet<string> = new Set([
  "0wnd.net",
  "10minutemail.com",
  "10minutemail.net",
  "20minutemail.com",
  "33mail.com",
  "anonbox.net",
  "burnermail.io",
  "dispostable.com",
  "dropmail.me",
  "easytrashmail.com",
  "emailondeck.com",
  "fakeinbox.com",
  "getairmail.com",
  "getnada.com",
  "guerrillamail.com",
  "guerrillamail.net",
  "guerrillamail.org",
  "inboxbear.com",
  "jetable.org",
  "mail-temp.com",
  "mailcatch.com",
  "maildrop.cc",
  "mailinator.com",
  "mailnesia.com",
  "mintemail.com",
  "mohmal.com",
  "mvrht.com",
  "mytemp.email",
  "nowmymail.com",
  "sharklasers.com",
  "spam4.me",
  "spambog.com",
  "spambox.us",
  "spamgourmet.com",
  "tempinbox.com",
  "tempmail.com",
  "tempmail.io",
  "tempmailaddress.com",
  "temp-mail.org",
  "tempmailo.com",
  "throwawaymail.com",
  "trashmail.com",
  "trashmail.de",
  "trashmail.net",
  "trbvm.com",
  "yopmail.com",
  "yopmail.fr",
  "yopmail.net",
]);

/** Common consumer ISPs — flag for B2B outbound scoring. */
export const FREE_CONSUMER_DOMAINS: ReadonlySet<string> = new Set([
  "aol.com",
  "comcast.net",
  "gmail.com",
  "googlemail.com",
  "hotmail.co.uk",
  "hotmail.com",
  "icloud.com",
  "live.com",
  "mail.com",
  "me.com",
  "msn.com",
  "outlook.com",
  "proton.me",
  "protonmail.com",
  "rocketmail.com",
  "yahoo.co.uk",
  "yahoo.com",
  "yandex.com",
  "ymail.com",
  "zoho.com",
]);

/** Domain typo candidates → corrected suggestion. */
const DOMAIN_TYPO_MAP: Record<string, string> = {
  "gmal.com": "gmail.com",
  "gmial.com": "gmail.com",
  "gmai.com": "gmail.com",
  "gmial.co": "gmail.com",
  "gmail.co": "gmail.com",
  "gmil.com": "gmail.com",
  "gnail.com": "gmail.com",
  "yaho.com": "yahoo.com",
  "yahooo.com": "yahoo.com",
  "yaoo.com": "yahoo.com",
  "ymial.com": "ymail.com",
  "hotnail.com": "hotmail.com",
  "hotmial.com": "hotmail.com",
  "hotmai.com": "hotmail.com",
  "hotmil.com": "hotmail.com",
  "outloook.com": "outlook.com",
  "outlok.com": "outlook.com",
  "outlookk.com": "outlook.com",
  "icould.com": "icloud.com",
  "iclod.com": "icloud.com",
  "iclould.com": "icloud.com",
};

export interface EmailValidationOptions {
  /** When true, throws on hard-fail classes; default false. */
  strict?: boolean;
}

export type EmailRiskLevel = "invalid" | "high" | "medium" | "low";

export interface EmailValidationResult {
  input: string;
  normalized: string | null;
  isValidSyntax: boolean;
  localPart: string | null;
  domain: string | null;
  /** Role account (info@, sales@, etc.). */
  isRoleAccount: boolean;
  /** Consumer inbox (gmail.com, hotmail.com, etc.). */
  isFreeConsumer: boolean;
  /** Throwaway / disposable provider. */
  isDisposable: boolean;
  /** Best-guess typo correction ("gmal.com" → "gmail.com"), or null. */
  suggestion: string | null;
  /** Plus-addressing subtag ("jane+news@x.com" → "news"), or null. */
  plusTag: string | null;
  /** Issues surfaced for UI. */
  issues: string[];
  /** Risk classification used by the sender gate. */
  risk: EmailRiskLevel;
}

/** Normalize: trim, lowercase the domain (local part is case-sensitive per RFC). */
export function normalizeEmail(raw: string): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const atIdx = trimmed.lastIndexOf("@");
  if (atIdx < 1 || atIdx === trimmed.length - 1) return null;
  const local = trimmed.slice(0, atIdx);
  const domain = trimmed.slice(atIdx + 1).toLowerCase();
  return `${local}@${domain}`;
}

/** Extract the subtag from a plus-addressed local part (jane+news → "news"). */
function extractPlusTag(local: string): string | null {
  const idx = local.indexOf("+");
  if (idx < 0 || idx === local.length - 1) return null;
  return local.slice(idx + 1);
}

/**
 * Validate an email address. Returns a rich result — callers pick fields.
 */
export function validateEmailAddress(
  raw: string,
  _opts: EmailValidationOptions = {},
): EmailValidationResult {
  const issues: string[] = [];
  const normalized = normalizeEmail(raw);
  if (!normalized) {
    return {
      input: raw,
      normalized: null,
      isValidSyntax: false,
      localPart: null,
      domain: null,
      isRoleAccount: false,
      isFreeConsumer: false,
      isDisposable: false,
      suggestion: null,
      plusTag: null,
      issues: ["missing_at_or_empty"],
      risk: "invalid",
    };
  }

  const atIdx = normalized.lastIndexOf("@");
  const localPart = normalized.slice(0, atIdx);
  const domain = normalized.slice(atIdx + 1);

  // Syntax checks.
  let isValidSyntax = true;
  if (localPart.length === 0 || localPart.length > 64) {
    isValidSyntax = false;
    issues.push("local_part_length");
  }
  if (domain.length === 0 || domain.length > 253) {
    isValidSyntax = false;
    issues.push("domain_length");
  }
  if (!LOCAL_ATOM.test(localPart)) {
    isValidSyntax = false;
    issues.push("local_part_invalid_chars");
  }
  if (localPart.startsWith(".") || localPart.endsWith(".") || localPart.includes("..")) {
    isValidSyntax = false;
    issues.push("local_part_dot_position");
  }
  // Domain must have at least one dot and only allow letters/digits/hyphens per label.
  const labels = domain.split(".");
  if (labels.length < 2) {
    isValidSyntax = false;
    issues.push("domain_no_tld");
  }
  for (const label of labels) {
    if (label.length === 0 || label.length > 63) {
      isValidSyntax = false;
      issues.push("domain_label_length");
      break;
    }
    if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(label)) {
      isValidSyntax = false;
      issues.push("domain_label_invalid");
      break;
    }
  }
  // TLD must be at least 2 chars and alphabetic.
  const tld = labels[labels.length - 1];
  if (tld && !/^[a-z]{2,}$/.test(tld)) {
    isValidSyntax = false;
    issues.push("tld_invalid");
  }

  const plusTag = extractPlusTag(localPart);
  const bareLocal = plusTag === null ? localPart : localPart.slice(0, localPart.indexOf("+"));

  const isRoleAccount = ROLE_ACCOUNT_LOCAL_PARTS.has(bareLocal.toLowerCase());
  const isFreeConsumer = FREE_CONSUMER_DOMAINS.has(domain);
  const isDisposable = DISPOSABLE_DOMAINS.has(domain);
  const suggestion = DOMAIN_TYPO_MAP[domain] ?? null;

  if (isRoleAccount) issues.push("role_account");
  if (isDisposable) issues.push("disposable_domain");
  if (suggestion) issues.push("likely_typo");

  let risk: EmailRiskLevel;
  if (!isValidSyntax) risk = "invalid";
  else if (isDisposable || suggestion) risk = "high";
  else if (isRoleAccount) risk = "medium";
  else risk = "low";

  return {
    input: raw,
    normalized,
    isValidSyntax,
    localPart,
    domain,
    isRoleAccount,
    isFreeConsumer,
    isDisposable,
    suggestion,
    plusTag,
    issues,
    risk,
  };
}

/**
 * Fast boolean path — callers that just need "should I send?" can use this.
 * Sends are allowed for low + medium risk. High + invalid are blocked by
 * default.
 */
export function isEmailSendable(raw: string): boolean {
  const r = validateEmailAddress(raw);
  return r.risk === "low" || r.risk === "medium";
}
