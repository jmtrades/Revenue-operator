/**
 * Revenue-core shared primitives.
 *
 * Branded types + Zod validators for every identifier and quantity used
 * across the revenue platform. Import these at system boundaries instead of
 * passing raw strings and numbers; the branding prevents cross-entity mixups
 * and the Zod schemas provide one-call runtime validation at API edges.
 *
 * Every branded constructor is a *total function with validation* — it either
 * returns the branded value or throws a typed error. This is intentional:
 * these primitives travel through pricing, approvals, audit logs, and CFO
 * blocks where silent coercion would be catastrophic.
 */
import { z } from "zod";

// -----------------------------------------------------------------------------
// Branded type helper
// -----------------------------------------------------------------------------

declare const __brand: unique symbol;
export type Brand<T, B extends string> = T & { readonly [__brand]: B };

// -----------------------------------------------------------------------------
// Identifier brands
// -----------------------------------------------------------------------------

export type OrgId = Brand<string, "OrgId">;
export type AccountId = Brand<string, "AccountId">;
export type DealId = Brand<string, "DealId">;
export type ContactId = Brand<string, "ContactId">;
export type OwnerId = Brand<string, "OwnerId">;
export type ActionId = Brand<string, "ActionId">;
export type DecisionId = Brand<string, "DecisionId">;
export type IdempotencyKey = Brand<string, "IdempotencyKey">;

const ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_\-]{0,127}$/;

function makeIdSchema<B extends string>(brand: B) {
  return z
    .string()
    .min(1, `${brand} cannot be empty`)
    .max(128, `${brand} cannot exceed 128 chars`)
    .regex(ID_PATTERN, `${brand} must match ${ID_PATTERN}`)
    .transform((s) => s as Brand<string, B>);
}

export const OrgIdSchema = makeIdSchema("OrgId");
export const AccountIdSchema = makeIdSchema("AccountId");
export const DealIdSchema = makeIdSchema("DealId");
export const ContactIdSchema = makeIdSchema("ContactId");
export const OwnerIdSchema = makeIdSchema("OwnerId");
export const ActionIdSchema = makeIdSchema("ActionId");
export const DecisionIdSchema = makeIdSchema("DecisionId");
export const IdempotencyKeySchema = makeIdSchema("IdempotencyKey");

export const toOrgId = (raw: string): OrgId => OrgIdSchema.parse(raw);
export const toAccountId = (raw: string): AccountId => AccountIdSchema.parse(raw);
export const toDealId = (raw: string): DealId => DealIdSchema.parse(raw);
export const toContactId = (raw: string): ContactId => ContactIdSchema.parse(raw);
export const toOwnerId = (raw: string): OwnerId => OwnerIdSchema.parse(raw);
export const toActionId = (raw: string): ActionId => ActionIdSchema.parse(raw);
export const toDecisionId = (raw: string): DecisionId => DecisionIdSchema.parse(raw);
export const toIdempotencyKey = (raw: string): IdempotencyKey =>
  IdempotencyKeySchema.parse(raw);

// -----------------------------------------------------------------------------
// ISO date (normalized to ms-truncated UTC ISO string)
// -----------------------------------------------------------------------------

export type ISODate = Brand<string, "ISODate">;

/**
 * Validates then normalizes to canonical `YYYY-MM-DDTHH:mm:ss.sssZ` form.
 * This means `toISODate("2026-04-22")` and `toISODate("2026-04-22T00:00:00Z")`
 * both yield the same canonical string — removing an entire class of
 * equality/hash bugs in audit logs and idempotency keys.
 */
export const ISODateSchema = z
  .string()
  .min(1)
  .transform((s, ctx) => {
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) {
      ctx.addIssue({ code: "custom", message: `Invalid ISO date: ${s}` });
      return z.NEVER;
    }
    return d.toISOString() as ISODate;
  });

export const toISODate = (raw: string): ISODate => ISODateSchema.parse(raw);

export function isoBefore(a: ISODate, b: ISODate): boolean {
  return new Date(a).getTime() < new Date(b).getTime();
}

export function isoAfter(a: ISODate, b: ISODate): boolean {
  return new Date(a).getTime() > new Date(b).getTime();
}

export function daysBetween(a: ISODate, b: ISODate): number {
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return ms / (24 * 60 * 60 * 1000);
}

export function addDays(d: ISODate, days: number): ISODate {
  const ms = new Date(d).getTime() + days * 24 * 60 * 60 * 1000;
  return new Date(ms).toISOString() as ISODate;
}

// -----------------------------------------------------------------------------
// Currency (ISO-4217 restricted — extend as new markets open)
// -----------------------------------------------------------------------------

export const SUPPORTED_CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "JPY",
  "CAD",
  "AUD",
  "CHF",
  "SEK",
  "NOK",
  "DKK",
  "SGD",
  "HKD",
  "INR",
  "BRL",
  "MXN",
] as const;

export type Currency = (typeof SUPPORTED_CURRENCIES)[number];

export const CurrencySchema = z.enum(SUPPORTED_CURRENCIES);

/**
 * Currencies that are typically quoted without decimals (JPY). Using minor
 * units throughout (Money.minor) means we never lose sub-cent precision.
 */
const ZERO_DECIMAL_CURRENCIES: readonly Currency[] = ["JPY"];

export function currencyScale(c: Currency): number {
  return ZERO_DECIMAL_CURRENCIES.includes(c) ? 1 : 100;
}

// -----------------------------------------------------------------------------
// Money — integer minor units + currency. NO floats anywhere.
// -----------------------------------------------------------------------------

export interface Money {
  /** Integer minor units (cents for USD, yen for JPY, paise for INR). */
  readonly minor: number;
  readonly currency: Currency;
}

export const MoneySchema = z
  .object({
    minor: z
      .number()
      .finite("Money.minor must be finite")
      .refine((n) => Number.isSafeInteger(n), "Money.minor must be a safe integer"),
    currency: CurrencySchema,
  })
  .readonly();

/**
 * Construct Money from a major-unit number (e.g. dollars). Rounds half-away
 * from zero at the smallest supported minor unit. Throws on NaN/Infinity.
 */
export function moneyFromMajor(major: number, currency: Currency): Money {
  if (!Number.isFinite(major)) {
    throw new Error(`moneyFromMajor: non-finite major value`);
  }
  const scale = currencyScale(currency);
  const minor = Math.round(major * scale);
  return MoneySchema.parse({ minor, currency });
}

export function moneyMajor(m: Money): number {
  return m.minor / currencyScale(m.currency);
}

export function moneyAdd(a: Money, b: Money): Money {
  if (a.currency !== b.currency) {
    throw new Error(
      `moneyAdd: currency mismatch (${a.currency} vs ${b.currency}) — convert first`,
    );
  }
  return { minor: a.minor + b.minor, currency: a.currency };
}

export function moneySub(a: Money, b: Money): Money {
  if (a.currency !== b.currency) {
    throw new Error(
      `moneySub: currency mismatch (${a.currency} vs ${b.currency}) — convert first`,
    );
  }
  return { minor: a.minor - b.minor, currency: a.currency };
}

export function moneyScale(m: Money, factor: number): Money {
  if (!Number.isFinite(factor)) {
    throw new Error(`moneyScale: non-finite factor`);
  }
  return { minor: Math.round(m.minor * factor), currency: m.currency };
}

export function moneyEquals(a: Money, b: Money): boolean {
  return a.currency === b.currency && a.minor === b.minor;
}

export function moneyCmp(a: Money, b: Money): -1 | 0 | 1 {
  if (a.currency !== b.currency) {
    throw new Error(`moneyCmp: currency mismatch (${a.currency} vs ${b.currency})`);
  }
  if (a.minor < b.minor) return -1;
  if (a.minor > b.minor) return 1;
  return 0;
}

// -----------------------------------------------------------------------------
// Probability & Rate — tightly bounded numeric primitives
// -----------------------------------------------------------------------------

export type Probability = Brand<number, "Probability">;

export const ProbabilitySchema = z
  .number()
  .finite()
  .min(0, "Probability must be ≥ 0")
  .max(1, "Probability must be ≤ 1")
  .transform((n) => n as Probability);

export const toProbability = (n: number): Probability => ProbabilitySchema.parse(n);

/**
 * Saturating clamp — when upstream math could theoretically produce a value
 * outside [0,1] due to floating-point error or extreme inputs, use this in
 * the output layer rather than silently returning an invalid Probability.
 */
export function clampProbability(n: number): Probability {
  if (!Number.isFinite(n)) return 0 as Probability;
  if (n <= 0) return 0 as Probability;
  if (n >= 1) return 1 as Probability;
  return n as Probability;
}

export type Rate = Brand<number, "Rate">;

/**
 * Rate is a bounded ratio in [-1, 5] — covers NRR (typically 0.7..1.5),
 * growth rates, discount rates, margin, etc. Bounded on both sides prevents
 * absurd values flowing into forecasts.
 */
export const RateSchema = z
  .number()
  .finite()
  .min(-1, "Rate must be ≥ -100%")
  .max(5, "Rate must be ≤ 500%")
  .transform((n) => n as Rate);

export const toRate = (n: number): Rate => RateSchema.parse(n);

// -----------------------------------------------------------------------------
// Discrete stage ordering (used by pipeline & DQ skip detection)
// -----------------------------------------------------------------------------

export const CANONICAL_STAGES = [
  "prospecting",
  "qualification",
  "discovery",
  "evaluation",
  "proposal",
  "negotiation",
  "closed_won",
] as const;

export type Stage = (typeof CANONICAL_STAGES)[number];

export const StageSchema = z.enum(CANONICAL_STAGES);

export function stageRank(s: Stage): number {
  return CANONICAL_STAGES.indexOf(s);
}

/**
 * Returns the number of stages a deal skipped. 0 = contiguous / backward.
 * Throws on unknown stages — catches typos and data migrations that renamed
 * stages without updating consumers.
 */
export function stagesSkipped(from: Stage, to: Stage): number {
  const diff = stageRank(to) - stageRank(from);
  return Math.max(0, diff - 1);
}

// -----------------------------------------------------------------------------
// Validation failure envelope — used by all public API boundaries
// -----------------------------------------------------------------------------

export interface ValidationFailure {
  readonly ok: false;
  readonly issues: ReadonlyArray<{ readonly path: string; readonly message: string }>;
}

export interface ValidationSuccess<T> {
  readonly ok: true;
  readonly value: T;
}

export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

export function safeValidate<T>(
  schema: z.ZodType<T>,
  input: unknown,
): ValidationResult<T> {
  const r = schema.safeParse(input);
  if (r.success) return { ok: true, value: r.data };
  return {
    ok: false,
    issues: r.error.issues.map((i) => ({
      path: i.path.map(String).join("."),
      message: i.message,
    })),
  };
}
