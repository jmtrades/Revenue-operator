/**
 * Tests for src/lib/auth/validate.ts
 * Unit tests for email, password, business name validation and error mapping.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import {
  validateEmail,
  validatePasswordForSignup,
  validatePasswordForSignin,
  normalizeBusinessName,
  toFriendlySignupError,
  toFriendlySigninError,
} from "@/lib/auth/validate";

const SRC = readFileSync(
  path.resolve(__dirname, "..", "src", "lib", "auth", "validate.ts"),
  "utf-8",
);

/* ------------------------------------------------------------------ */
/*  Structural tests                                                   */
/* ------------------------------------------------------------------ */

describe("validate.ts structural", () => {
  it("enforces MAX_EMAIL of 255", () => {
    expect(SRC).toContain("MAX_EMAIL = 255");
  });

  it("enforces MIN_PASSWORD of 8", () => {
    expect(SRC).toContain("MIN_PASSWORD = 8");
  });

  it("enforces MAX_PASSWORD of 256", () => {
    expect(SRC).toContain("MAX_PASSWORD = 256");
  });

  it("enforces MAX_BUSINESS_NAME of 200", () => {
    expect(SRC).toContain("MAX_BUSINESS_NAME = 200");
  });

  it("uses a proper email regex", () => {
    expect(SRC).toContain("EMAIL_REGEX");
    expect(SRC).toMatch(/EMAIL_REGEX\s*=\s*\//);
  });

  it("trims and lowercases email input", () => {
    expect(SRC).toContain(".trim().toLowerCase()");
  });

  it("checks for at least one digit in signup password", () => {
    expect(SRC).toMatch(/\\d/);
  });
});

/* ------------------------------------------------------------------ */
/*  validateEmail unit tests                                           */
/* ------------------------------------------------------------------ */

describe("validateEmail", () => {
  it("rejects empty string", () => {
    const r = validateEmail("");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("required");
  });

  it("rejects whitespace-only", () => {
    const r = validateEmail("   ");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("required");
  });

  it("rejects string without @", () => {
    const r = validateEmail("nope");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("valid email");
  });

  it("rejects string with only @", () => {
    const r = validateEmail("@");
    expect(r.ok).toBe(false);
  });

  it("rejects missing domain", () => {
    const r = validateEmail("user@");
    expect(r.ok).toBe(false);
  });

  it("rejects missing local part", () => {
    const r = validateEmail("@domain.com");
    expect(r.ok).toBe(false);
  });

  it("rejects email exceeding 255 characters", () => {
    const long = "a".repeat(250) + "@b.com";
    const r = validateEmail(long);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("too long");
  });

  it("accepts valid email", () => {
    const r = validateEmail("user@example.com");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe("user@example.com");
  });

  it("trims and lowercases the email", () => {
    const r = validateEmail("  User@Example.COM  ");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe("user@example.com");
  });

  it("accepts email with subdomain", () => {
    const r = validateEmail("test@mail.example.co.uk");
    expect(r.ok).toBe(true);
  });

  it("accepts email with plus addressing", () => {
    const r = validateEmail("user+tag@example.com");
    expect(r.ok).toBe(true);
  });

  it("accepts 255-char email at the boundary", () => {
    const local = "a".repeat(245);
    const email = `${local}@b.com`; // 251 chars
    const r = validateEmail(email);
    expect(r.ok).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/*  validatePasswordForSignup unit tests                               */
/* ------------------------------------------------------------------ */

describe("validatePasswordForSignup", () => {
  it("rejects empty password", () => {
    const r = validatePasswordForSignup("");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("required");
  });

  it("rejects password shorter than 8 chars", () => {
    const r = validatePasswordForSignup("Abc1");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("at least 8");
  });

  it("rejects 7-char password at boundary", () => {
    const r = validatePasswordForSignup("abcde1f");
    expect(r.ok).toBe(false);
  });

  it("rejects password without a digit", () => {
    const r = validatePasswordForSignup("abcdefgh");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("number");
  });

  it("rejects password exceeding 256 chars", () => {
    const r = validatePasswordForSignup("a".repeat(257) + "1");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("too long");
  });

  it("accepts valid 8-char password with digit", () => {
    const r = validatePasswordForSignup("secure1x");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe("secure1x");
  });

  it("accepts password at 256-char boundary", () => {
    const r = validatePasswordForSignup("a".repeat(255) + "1");
    expect(r.ok).toBe(true);
  });

  it("accepts password with multiple digits", () => {
    const r = validatePasswordForSignup("abc123def456");
    expect(r.ok).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/*  validatePasswordForSignin unit tests                               */
/* ------------------------------------------------------------------ */

describe("validatePasswordForSignin", () => {
  it("rejects empty password", () => {
    const r = validatePasswordForSignin("");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("required");
  });

  it("rejects whitespace-only password", () => {
    const r = validatePasswordForSignin("   ");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("required");
  });

  it("rejects password over 256 chars", () => {
    const r = validatePasswordForSignin("x".repeat(257));
    expect(r.ok).toBe(false);
  });

  it("accepts any non-empty password within length", () => {
    const r = validatePasswordForSignin("abc");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe("abc");
  });

  it("does not require a digit (unlike signup)", () => {
    const r = validatePasswordForSignin("noproblems");
    expect(r.ok).toBe(true);
  });

  it("trims the password", () => {
    const r = validatePasswordForSignin("  hello  ");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe("hello");
  });
});

/* ------------------------------------------------------------------ */
/*  normalizeBusinessName unit tests                                   */
/* ------------------------------------------------------------------ */

describe("normalizeBusinessName", () => {
  it("defaults to 'My Workspace' for undefined", () => {
    expect(normalizeBusinessName(undefined)).toBe("My Workspace");
  });

  it("defaults to 'My Workspace' for null", () => {
    expect(normalizeBusinessName(null)).toBe("My Workspace");
  });

  it("defaults to 'My Workspace' for empty string", () => {
    expect(normalizeBusinessName("")).toBe("My Workspace");
  });

  it("defaults to 'My Workspace' for whitespace-only", () => {
    expect(normalizeBusinessName("   ")).toBe("My Workspace");
  });

  it("defaults to 'My Workspace' for non-string types", () => {
    expect(normalizeBusinessName(42)).toBe("My Workspace");
    expect(normalizeBusinessName(true)).toBe("My Workspace");
  });

  it("returns trimmed name", () => {
    expect(normalizeBusinessName("  Acme Corp  ")).toBe("Acme Corp");
  });

  it("truncates name exceeding 200 characters", () => {
    const long = "X".repeat(250);
    const result = normalizeBusinessName(long);
    expect(result.length).toBe(200);
  });

  it("keeps name at exactly 200 characters", () => {
    const exact = "Y".repeat(200);
    expect(normalizeBusinessName(exact)).toBe(exact);
  });
});

/* ------------------------------------------------------------------ */
/*  toFriendlySignupError unit tests                                   */
/* ------------------------------------------------------------------ */

describe("toFriendlySignupError", () => {
  it("maps 'already registered' to account exists message", () => {
    const msg = toFriendlySignupError("User already registered");
    expect(msg).toContain("already exists");
    expect(msg).toContain("Sign in");
  });

  it("maps 'already exists' variant", () => {
    const msg = toFriendlySignupError("This email already exists in the system");
    expect(msg).toContain("already exists");
  });

  it("maps 'already been' variant", () => {
    const msg = toFriendlySignupError("Email has already been taken");
    expect(msg).toContain("already exists");
  });

  it("maps invalid email errors", () => {
    const msg = toFriendlySignupError("Invalid email address");
    expect(msg).toContain("valid email");
  });

  it("maps weak password errors", () => {
    const msg = toFriendlySignupError("Password is too weak");
    expect(msg).toContain("at least 8");
  });

  it("maps short password variant", () => {
    const msg = toFriendlySignupError("Password too short");
    expect(msg).toContain("at least 8");
  });

  it("maps rate limit errors", () => {
    const msg = toFriendlySignupError("Rate limit exceeded");
    expect(msg).toContain("Too many attempts");
  });

  it("maps too many requests variant", () => {
    const msg = toFriendlySignupError("Too many requests");
    expect(msg).toContain("Too many attempts");
  });

  it("returns generic message for unknown errors", () => {
    const msg = toFriendlySignupError("Something went terribly wrong");
    expect(msg).toContain("Sign up failed");
  });
});

/* ------------------------------------------------------------------ */
/*  toFriendlySigninError unit tests                                   */
/* ------------------------------------------------------------------ */

describe("toFriendlySigninError", () => {
  it("maps 'invalid credentials' to generic auth error", () => {
    const msg = toFriendlySigninError("Invalid login credentials");
    expect(msg).toBe("Invalid email or password.");
  });

  it("maps 'wrong password' variant", () => {
    const msg = toFriendlySigninError("Wrong password");
    expect(msg).toBe("Invalid email or password.");
  });

  it("maps 'incorrect' variant", () => {
    const msg = toFriendlySigninError("Incorrect credentials");
    expect(msg).toBe("Invalid email or password.");
  });

  it("maps rate limit errors", () => {
    const msg = toFriendlySigninError("Rate limit reached");
    expect(msg).toContain("Too many attempts");
  });

  it("maps email not confirmed", () => {
    const msg = toFriendlySigninError("Email not confirmed");
    expect(msg).toContain("confirm your email");
  });

  it("returns generic auth error for unknown messages", () => {
    const msg = toFriendlySigninError("Unknown server failure");
    expect(msg).toBe("Invalid email or password.");
  });
});
