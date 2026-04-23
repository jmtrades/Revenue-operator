/**
 * Phase 78 Task 11.4 — Circuit breaker primitive.
 *
 * State machine: closed → open (after threshold failures within rollingWindowMs)
 * → half_open (after cooldownMs) → closed on success / open on failure.
 *
 * Exists to prevent the queue worker from hammering a degraded downstream
 * (Twilio/Telnyx/Resend/etc.) while that downstream is failing: instead of
 * every retry going out and failing, the breaker fails fast with a
 * `CircuitOpenError` until the downstream recovers.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  CircuitBreaker,
  CircuitOpenError,
  type CircuitState,
} from "../../src/lib/reliability/circuit-breaker";

describe("CircuitBreaker", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-22T00:00:00Z"));
  });

  it("starts in closed state", () => {
    const cb = new CircuitBreaker({
      name: "test",
      threshold: 3,
      cooldownMs: 60_000,
      rollingWindowMs: 60_000,
    });
    expect(cb.getState()).toBe<CircuitState>("closed");
  });

  it("allows calls through when closed", async () => {
    const cb = new CircuitBreaker({
      name: "test",
      threshold: 3,
      cooldownMs: 60_000,
      rollingWindowMs: 60_000,
    });
    const fn = vi.fn().mockResolvedValue("ok");
    await expect(cb.execute(fn)).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledOnce();
    expect(cb.getState()).toBe<CircuitState>("closed");
  });

  it("opens after threshold consecutive failures", async () => {
    const cb = new CircuitBreaker({
      name: "test",
      threshold: 3,
      cooldownMs: 60_000,
      rollingWindowMs: 60_000,
    });
    const failing = vi.fn().mockRejectedValue(new Error("boom"));

    for (let i = 0; i < 3; i++) {
      await expect(cb.execute(failing)).rejects.toThrow("boom");
    }
    expect(cb.getState()).toBe<CircuitState>("open");
  });

  it("throws CircuitOpenError and skips fn when open", async () => {
    const cb = new CircuitBreaker({
      name: "test",
      threshold: 2,
      cooldownMs: 60_000,
      rollingWindowMs: 60_000,
    });
    const failing = vi.fn().mockRejectedValue(new Error("boom"));
    await expect(cb.execute(failing)).rejects.toThrow("boom");
    await expect(cb.execute(failing)).rejects.toThrow("boom");
    expect(cb.getState()).toBe<CircuitState>("open");

    const shouldNotRun = vi.fn().mockResolvedValue("ok");
    await expect(cb.execute(shouldNotRun)).rejects.toBeInstanceOf(CircuitOpenError);
    expect(shouldNotRun).not.toHaveBeenCalled();
  });

  it("transitions to half_open after cooldown elapses", async () => {
    const cb = new CircuitBreaker({
      name: "test",
      threshold: 2,
      cooldownMs: 30_000,
      rollingWindowMs: 60_000,
    });
    const failing = vi.fn().mockRejectedValue(new Error("boom"));
    await expect(cb.execute(failing)).rejects.toThrow();
    await expect(cb.execute(failing)).rejects.toThrow();
    expect(cb.getState()).toBe<CircuitState>("open");

    vi.advanceTimersByTime(30_001);
    // getState alone must reflect the elapsed cooldown.
    expect(cb.getState()).toBe<CircuitState>("half_open");
  });

  it("closes after a successful probe from half_open", async () => {
    const cb = new CircuitBreaker({
      name: "test",
      threshold: 2,
      cooldownMs: 30_000,
      rollingWindowMs: 60_000,
    });
    await expect(cb.execute(() => Promise.reject(new Error("boom")))).rejects.toThrow();
    await expect(cb.execute(() => Promise.reject(new Error("boom")))).rejects.toThrow();
    vi.advanceTimersByTime(30_001);

    const ok = vi.fn().mockResolvedValue("ok");
    await expect(cb.execute(ok)).resolves.toBe("ok");
    expect(cb.getState()).toBe<CircuitState>("closed");
  });

  it("re-opens on a failing probe from half_open without requiring threshold again", async () => {
    const cb = new CircuitBreaker({
      name: "test",
      threshold: 2,
      cooldownMs: 30_000,
      rollingWindowMs: 60_000,
    });
    await expect(cb.execute(() => Promise.reject(new Error("boom")))).rejects.toThrow();
    await expect(cb.execute(() => Promise.reject(new Error("boom")))).rejects.toThrow();
    vi.advanceTimersByTime(30_001);
    expect(cb.getState()).toBe<CircuitState>("half_open");

    await expect(cb.execute(() => Promise.reject(new Error("still boom")))).rejects.toThrow();
    expect(cb.getState()).toBe<CircuitState>("open");
  });

  it("forgets failures older than rollingWindowMs", async () => {
    const cb = new CircuitBreaker({
      name: "test",
      threshold: 3,
      cooldownMs: 60_000,
      rollingWindowMs: 10_000,
    });
    await expect(cb.execute(() => Promise.reject(new Error("e")))).rejects.toThrow();
    await expect(cb.execute(() => Promise.reject(new Error("e")))).rejects.toThrow();
    // Two failures in the window, not yet at threshold=3.
    expect(cb.getState()).toBe<CircuitState>("closed");

    // Advance past the rolling window — both old failures expire.
    vi.advanceTimersByTime(10_001);

    // A single fresh failure must NOT be enough to open, because the two old
    // failures have aged out of the rolling window.
    await expect(cb.execute(() => Promise.reject(new Error("e")))).rejects.toThrow();
    expect(cb.getState()).toBe<CircuitState>("closed");
  });

  it("success resets the failure counter while closed", async () => {
    const cb = new CircuitBreaker({
      name: "test",
      threshold: 3,
      cooldownMs: 60_000,
      rollingWindowMs: 60_000,
    });
    await expect(cb.execute(() => Promise.reject(new Error("e")))).rejects.toThrow();
    await expect(cb.execute(() => Promise.reject(new Error("e")))).rejects.toThrow();
    await expect(cb.execute(() => Promise.resolve("ok"))).resolves.toBe("ok");
    // After the success, prior failures no longer count toward threshold.
    await expect(cb.execute(() => Promise.reject(new Error("e")))).rejects.toThrow();
    await expect(cb.execute(() => Promise.reject(new Error("e")))).rejects.toThrow();
    expect(cb.getState()).toBe<CircuitState>("closed");
  });

  it("CircuitOpenError carries the breaker name", async () => {
    const cb = new CircuitBreaker({
      name: "twilio-sms",
      threshold: 1,
      cooldownMs: 60_000,
      rollingWindowMs: 60_000,
    });
    await expect(cb.execute(() => Promise.reject(new Error("boom")))).rejects.toThrow();
    try {
      await cb.execute(() => Promise.resolve("ok"));
      throw new Error("expected CircuitOpenError");
    } catch (err) {
      expect(err).toBeInstanceOf(CircuitOpenError);
      expect((err as CircuitOpenError).breakerName).toBe("twilio-sms");
    }
  });

  it("reset() returns the breaker to closed from any state", async () => {
    const cb = new CircuitBreaker({
      name: "test",
      threshold: 1,
      cooldownMs: 60_000,
      rollingWindowMs: 60_000,
    });
    await expect(cb.execute(() => Promise.reject(new Error("boom")))).rejects.toThrow();
    expect(cb.getState()).toBe<CircuitState>("open");
    cb.reset();
    expect(cb.getState()).toBe<CircuitState>("closed");
  });
});
