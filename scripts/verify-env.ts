/**
 * Environment readiness report for production.
 * Prints only variable names and status — never secret values.
 *
 * Modes:
 *   (default)   presence check — every REQUIRED_FOR_PRODUCTION var must be set.
 *   --strict    presence check + placeholder rejection — every required var
 *               must be set AND must not match a known placeholder shape.
 *               Used in pre-deploy gates so CI placeholder values can never
 *               reach a production environment.
 *
 * The strict mode is the enforcement point for the post-mortem finding
 * "CI-stage placeholder env values (e.g. `placeholder`, `https://placeholder.supabase.co`)
 *  must be rejected before any real deploy." See Phase 78 Task 11.2.
 */

const REQUIRED_FOR_PRODUCTION = [
  "NEXT_PUBLIC_APP_URL",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRICE_ID",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SESSION_SECRET",
  "CRON_SECRET",
] as const;

const OPTIONAL_BUT_RECOMMENDED = [
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "TWILIO_PROXY_NUMBER",
  "RESEND_API_KEY",
  "EMAIL_FROM",
];

const ENCRYPTION_KEY_ALT = "ENCRYPTION_KEY"; // Alternative to SESSION_SECRET

/**
 * Case-insensitive substring/pattern fragments that indicate a value is
 * obviously a placeholder rather than a real secret. Kept deliberately
 * broad — false positives here are preferable to shipping a placeholder
 * to production. Mirrors (and intentionally overlaps with) the allowlist
 * in `scripts/scan-secrets.ts`.
 */
const PLACEHOLDER_PATTERNS: readonly RegExp[] = [
  /placeholder/i,
  /\bexample\b/i,
  /\bsample\b/i,
  /\bdummy\b/i,
  /\bfake\b/i,
  /\btest[_-]?(key|secret|token|value)/i,
  /\bchange[_-]?me\b/i,
  /your[_-]?(key|secret|token|password|api|url)/i,
  /\bredacted\b/i,
  /\bTODO\b/,
  /^x{6,}$/i, // xxxxxx style fillers
  /\.{3,}/, // "..."
  /^\$\{[A-Z_]+\}$/, // ${VAR} template
  /^<[^>]+>$/, // <value-from-...>, <PROJECT_REF>, etc.
  /^\[[^\]]+\]$/, // [PASSWORD], [REGION]
  /^(none|null|undefined|empty|unset|n\/a|na)$/i,
];

function isPlaceholder(value: string): { hit: boolean; reason?: string } {
  for (const pattern of PLACEHOLDER_PATTERNS) {
    if (pattern.test(value)) {
      // Match the fragment that triggered, without leaking surrounding chars.
      return { hit: true, reason: pattern.source };
    }
  }
  return { hit: false };
}

function has(name: string): boolean {
  const v = process.env[name];
  return typeof v === "string" && v.length > 0;
}

function getValue(name: string): string | undefined {
  const v = process.env[name];
  return typeof v === "string" ? v : undefined;
}

function main() {
  const strict = process.argv.includes("--strict");
  const modeLabel = strict ? " (strict — placeholders rejected)" : "";

  console.log(`\n--- Environment Readiness Report${modeLabel} ---\n`);
  console.log("Required for production:");
  let allRequired = true;
  const placeholderHits: string[] = [];

  for (const name of REQUIRED_FOR_PRODUCTION) {
    const effectiveName =
      name === "SESSION_SECRET"
        ? has("SESSION_SECRET")
          ? "SESSION_SECRET"
          : has(ENCRYPTION_KEY_ALT)
            ? ENCRYPTION_KEY_ALT
            : "SESSION_SECRET"
        : name;

    const present =
      name === "SESSION_SECRET" ? has("SESSION_SECRET") || has(ENCRYPTION_KEY_ALT) : has(name);

    let status = present ? "✓" : "✗";
    let extra = "";

    if (present && strict) {
      const value = getValue(effectiveName) ?? "";
      const { hit, reason } = isPlaceholder(value);
      if (hit) {
        status = "✗";
        extra = `  [placeholder: matches /${reason}/]`;
        placeholderHits.push(`${name}${effectiveName === name ? "" : ` (via ${effectiveName})`}`);
      }
    }

    console.log(`  ${status} ${name}${extra}`);
    if (!present || (strict && extra)) allRequired = false;
  }

  console.log("\nOptional (recommended):");
  for (const name of OPTIONAL_BUT_RECOMMENDED) {
    const ok = has(name);
    let extra = "";
    if (ok && strict) {
      const { hit, reason } = isPlaceholder(getValue(name) ?? "");
      if (hit) extra = `  [WARNING: placeholder value, matches /${reason}/]`;
    }
    console.log(`  ${ok ? "✓" : "—"} ${name}${extra}`);
  }

  console.log("\n--- End Report ---\n");

  if (!allRequired) {
    if (placeholderHits.length > 0) {
      console.log(`Placeholder values detected in: ${placeholderHits.join(", ")}`);
      console.log("These look like CI/test placeholders, not real secrets. Rotate and set the real values before deploying.");
    } else {
      console.log("Set missing required variables in your hosting provider (or .env.local) and redeploy.");
    }
    process.exit(1);
  }
  console.log(
    strict
      ? "All required variables are set and none match a placeholder pattern."
      : "All required variables are set.",
  );
}

main();
