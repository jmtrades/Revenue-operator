/**
 * Phase 16 — Email address validation.
 */

import { describe, it, expect } from "vitest";
import {
  validateEmailAddress,
  isEmailSendable,
  normalizeEmail,
  ROLE_ACCOUNT_LOCAL_PARTS,
  DISPOSABLE_DOMAINS,
  FREE_CONSUMER_DOMAINS,
} from "../src/lib/validation/email-address";

describe("normalizeEmail", () => {
  it("lowercases the domain, preserves case in local part", () => {
    expect(normalizeEmail("Jane.Doe@Example.COM")).toBe("Jane.Doe@example.com");
  });

  it("trims whitespace", () => {
    expect(normalizeEmail("  jane@example.com  ")).toBe("jane@example.com");
  });

  it("returns null for non-strings and empties", () => {
    expect(normalizeEmail("")).toBeNull();
    expect(normalizeEmail("no-at-sign")).toBeNull();
    expect(normalizeEmail("@example.com")).toBeNull();
    expect(normalizeEmail("jane@")).toBeNull();
  });
});

describe("validateEmailAddress — syntax", () => {
  it("accepts standard addresses", () => {
    const r = validateEmailAddress("jane.doe@example.com");
    expect(r.isValidSyntax).toBe(true);
    expect(r.risk).toBe("low");
  });

  it("accepts + addressing", () => {
    const r = validateEmailAddress("jane+tag@example.com");
    expect(r.isValidSyntax).toBe(true);
    expect(r.plusTag).toBe("tag");
  });

  it("accepts subdomains", () => {
    expect(validateEmailAddress("a@b.c.example.com").isValidSyntax).toBe(true);
  });

  it("rejects local starting/ending/double dot", () => {
    expect(validateEmailAddress(".jane@x.com").isValidSyntax).toBe(false);
    expect(validateEmailAddress("jane.@x.com").isValidSyntax).toBe(false);
    expect(validateEmailAddress("jane..doe@x.com").isValidSyntax).toBe(false);
  });

  it("rejects missing TLD", () => {
    expect(validateEmailAddress("jane@localhost").isValidSyntax).toBe(false);
  });

  it("rejects numeric-only TLD", () => {
    expect(validateEmailAddress("jane@example.123").isValidSyntax).toBe(false);
  });

  it("rejects spaces in local", () => {
    expect(validateEmailAddress("jane doe@x.com").isValidSyntax).toBe(false);
  });

  it("rejects local part over 64 chars", () => {
    const longLocal = "a".repeat(65);
    expect(validateEmailAddress(`${longLocal}@x.com`).isValidSyntax).toBe(false);
  });

  it("rejects labels starting with hyphen", () => {
    expect(validateEmailAddress("jane@-example.com").isValidSyntax).toBe(false);
  });
});

describe("validateEmailAddress — role accounts", () => {
  it("flags well-known role prefixes", () => {
    for (const local of ["info", "sales", "support", "billing", "admin"]) {
      const r = validateEmailAddress(`${local}@example.com`);
      expect(r.isRoleAccount).toBe(true);
      expect(r.risk).toBe("medium");
    }
  });

  it("does not flag normal addresses", () => {
    expect(validateEmailAddress("jane@example.com").isRoleAccount).toBe(false);
  });

  it("strips plus-tag before role check", () => {
    const r = validateEmailAddress("sales+abc@example.com");
    expect(r.isRoleAccount).toBe(true);
  });

  it("role account set is non-empty and lowercase", () => {
    expect(ROLE_ACCOUNT_LOCAL_PARTS.size).toBeGreaterThan(20);
    for (const k of ROLE_ACCOUNT_LOCAL_PARTS) {
      expect(k).toBe(k.toLowerCase());
    }
  });
});

describe("validateEmailAddress — disposable", () => {
  it("flags mailinator and guerrillamail", () => {
    expect(validateEmailAddress("jane@mailinator.com").isDisposable).toBe(true);
    expect(validateEmailAddress("jane@guerrillamail.com").isDisposable).toBe(true);
    expect(validateEmailAddress("jane@yopmail.com").isDisposable).toBe(true);
  });

  it("disposable raises risk to high", () => {
    expect(validateEmailAddress("jane@mailinator.com").risk).toBe("high");
  });

  it("disposable domain list has reasonable size", () => {
    expect(DISPOSABLE_DOMAINS.size).toBeGreaterThan(30);
  });
});

describe("validateEmailAddress — free consumer", () => {
  it("flags gmail, yahoo, outlook", () => {
    expect(validateEmailAddress("jane@gmail.com").isFreeConsumer).toBe(true);
    expect(validateEmailAddress("jane@yahoo.com").isFreeConsumer).toBe(true);
    expect(validateEmailAddress("jane@outlook.com").isFreeConsumer).toBe(true);
  });

  it("does not hard-gate free consumer addresses", () => {
    const r = validateEmailAddress("jane@gmail.com");
    expect(r.risk).toBe("low");
  });

  it("free consumer set is non-empty and lowercase", () => {
    expect(FREE_CONSUMER_DOMAINS.size).toBeGreaterThan(10);
    for (const d of FREE_CONSUMER_DOMAINS) {
      expect(d).toBe(d.toLowerCase());
    }
  });
});

describe("validateEmailAddress — typo suggestions", () => {
  it("suggests fix for gmal.com", () => {
    const r = validateEmailAddress("jane@gmal.com");
    expect(r.suggestion).toBe("gmail.com");
    expect(r.risk).toBe("high");
  });

  it("suggests fix for hotmial.com", () => {
    expect(validateEmailAddress("jane@hotmial.com").suggestion).toBe("hotmail.com");
  });

  it("no suggestion for real domains", () => {
    expect(validateEmailAddress("jane@example.com").suggestion).toBeNull();
  });
});

describe("isEmailSendable", () => {
  it("allows normal and role addresses", () => {
    expect(isEmailSendable("jane@example.com")).toBe(true);
    expect(isEmailSendable("info@example.com")).toBe(true);
  });

  it("blocks disposable and invalid", () => {
    expect(isEmailSendable("jane@mailinator.com")).toBe(false);
    expect(isEmailSendable("not-an-email")).toBe(false);
  });

  it("blocks likely typos", () => {
    expect(isEmailSendable("jane@gmal.com")).toBe(false);
  });
});
