/**
 * Phase 78 Task 11.4 — Circuit breaker.
 *
 * Pure, in-memory state machine. Wraps a call to a flaky downstream
 * (Twilio / Telnyx / Resend / Stripe) and fails fast once that downstream
 * crosses a failure-rate threshold, instead of letting the queue worker
 * retry every job and waste provider quota or rate limits.
 *
 * State machine:
 *   closed     — calls pass through. Each failure is recorded with a
 *                timestamp. If the number of failures inside the trailing
 *                rollingWindowMs reaches `threshold`, the breaker opens.
 *                A success while closed clears the failure history (typical
 *                hystrix-style behaviour — we want a clean slate after a
 *                proven-good call).
 *
 *   open       — calls short-circuit immediately with `CircuitOpenError`.
 *                After `cooldownMs` has elapsed since the open-transition,
 *                the breaker becomes half_open on the next .execute() or
 *                .getState() lookup.
 *
 *   half_open  — ONE probe is allowed through. If it succeeds, the breaker
 *                closes (full traffic resumes). If it fails, the breaker
 *                immediately re-opens with a fresh cooldown.
 *
 * This deliberately does NOT persist across process restarts — a new worker
 * starts closed, which is the safe default (single extra failed call is far
 * less costly than a latched-open breaker blocking a healthy provider).
 *
 * Time is read through `Date.now()` so vi.useFakeTimers() works in tests.
 */

export type CircuitState = "closed" | "open" | "half_open";

export interface CircuitBreakerOptions {
  /** Name for logs + thrown-error payload. Should identify the downstream. */
  name: string;
  /** Failures within rollingWindowMs that cause the breaker to open. */
  threshold: number;
  /** Time the breaker stays open before a half-open probe is allowed. */
  cooldownMs: number;
  /** Trailing window over which failures count toward threshold. */
  rollingWindowMs: number;
}

export class CircuitOpenError extends Error {
  public readonly breakerName: string;
  constructor(breakerName: string) {
    super(`Circuit '${breakerName}' is open — short-circuited call`);
    this.name = "CircuitOpenError";
    this.breakerName = breakerName;
  }
}

export class CircuitBreaker {
  private state: CircuitState = "closed";
  private failureTimestamps: number[] = [];
  private openedAt: number | null = null;

  constructor(private readonly options: CircuitBreakerOptions) {
    if (options.threshold < 1) {
      throw new Error("CircuitBreaker: threshold must be >= 1");
    }
    if (options.cooldownMs < 0 || options.rollingWindowMs < 0) {
      throw new Error("CircuitBreaker: time values must be >= 0");
    }
  }

  /**
   * Current state. Recomputes on each call so a caller who only calls
   * getState() after a cooldown period still observes half_open.
   */
  getState(): CircuitState {
    this.maybePromoteToHalfOpen();
    return this.state;
  }

  /** Manual override — primarily for tests and `/health` recovery actions. */
  reset(): void {
    this.state = "closed";
    this.failureTimestamps = [];
    this.openedAt = null;
  }

  /**
   * Run `fn` through the breaker.
   *  - If closed or half_open, calls `fn`.
   *  - If open (and cooldown not yet elapsed), throws CircuitOpenError without
   *    calling fn.
   *  - Records success/failure and triggers state transitions.
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.maybePromoteToHalfOpen();

    if (this.state === "open") {
      throw new CircuitOpenError(this.options.name);
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      throw err;
    }
  }

  /** If we're open and cooldown has elapsed, flip to half_open. */
  private maybePromoteToHalfOpen(): void {
    if (this.state !== "open" || this.openedAt === null) return;
    if (Date.now() - this.openedAt >= this.options.cooldownMs) {
      this.state = "half_open";
    }
  }

  private onSuccess(): void {
    if (this.state === "half_open") {
      // Probe succeeded — full recovery.
      this.state = "closed";
      this.failureTimestamps = [];
      this.openedAt = null;
      return;
    }
    // Closed-state success also resets the rolling failure window.
    this.failureTimestamps = [];
  }

  private onFailure(): void {
    const now = Date.now();

    if (this.state === "half_open") {
      // Probe failed — re-open with a fresh cooldown.
      this.state = "open";
      this.openedAt = now;
      return;
    }

    // Closed-state failure: record, prune, maybe open.
    this.failureTimestamps.push(now);
    const cutoff = now - this.options.rollingWindowMs;
    this.failureTimestamps = this.failureTimestamps.filter((t) => t > cutoff);

    if (this.failureTimestamps.length >= this.options.threshold) {
      this.state = "open";
      this.openedAt = now;
    }
  }
}
