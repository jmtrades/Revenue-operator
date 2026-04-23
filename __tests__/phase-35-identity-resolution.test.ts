/**
 * Phase 35 — Identity resolution / dedup.
 */

import { describe, it, expect } from "vitest";
import {
  normalizeName,
  normalizeEmail,
  normalizePhone,
  normalizeDomain,
  normalizeLinkedin,
  nameSimilarity,
  compareRecords,
  findDuplicates,
  clusterRecords,
  type PersonRecord,
} from "../src/lib/sales/identity-resolution";

describe("normalizers", () => {
  it("normalizeName strips titles + diacritics + punctuation", () => {
    expect(normalizeName("Dr. José O'Brien-Smith, Jr.")).toBe("jose o'brien-smith");
  });

  it("normalizeEmail folds gmail dots and +tags", () => {
    expect(normalizeEmail("John.Doe+foo@Gmail.com")).toBe("johndoe@gmail.com");
  });

  it("normalizeEmail treats googlemail as gmail", () => {
    expect(normalizeEmail("a@googlemail.com")).toBe("a@gmail.com");
  });

  it("normalizeEmail preserves non-gmail local parts", () => {
    expect(normalizeEmail("First.Last+tag@Acme.Co")).toBe("first.last@acme.co");
  });

  it("normalizePhone reduces to E.164", () => {
    expect(normalizePhone("+1 (415) 555-1212")).toBe("+14155551212");
  });

  it("normalizeDomain strips protocol + www", () => {
    expect(normalizeDomain("https://www.Acme.com/path")).toBe("acme.com");
  });

  it("normalizeLinkedin extracts slug", () => {
    expect(normalizeLinkedin("https://www.linkedin.com/in/jane-doe/")).toBe("jane-doe");
  });
});

describe("nameSimilarity", () => {
  it("exact match → 1", () => {
    expect(nameSimilarity("Jane Doe", "jane doe")).toBe(1);
  });

  it("reordered tokens score high", () => {
    expect(nameSimilarity("Jane Doe", "Doe Jane")).toBeGreaterThanOrEqual(0.99);
  });

  it("one typo still high", () => {
    expect(nameSimilarity("Jane Doe", "Jame Doe")).toBeGreaterThan(0.8);
  });

  it("totally different low", () => {
    expect(nameSimilarity("Jane Doe", "Mike Smith")).toBeLessThan(0.4);
  });
});

describe("compareRecords — exact email", () => {
  it("exact email → high confidence", () => {
    const a: PersonRecord = { id: "a", email: "john@acme.com" };
    const b: PersonRecord = { id: "b", email: "John@acme.com" };
    const c = compareRecords(a, b);
    expect(c.shouldMerge).toBe(true);
    expect(c.reasons.some((r) => r.code === "exact_email")).toBe(true);
  });

  it("gmail dot variants match", () => {
    const a: PersonRecord = { id: "a", email: "john.doe@gmail.com" };
    const b: PersonRecord = { id: "b", email: "johndoe@gmail.com" };
    expect(compareRecords(a, b).shouldMerge).toBe(true);
  });

  it("gmail +tag variants match", () => {
    const a: PersonRecord = { id: "a", email: "john+crm@gmail.com" };
    const b: PersonRecord = { id: "b", email: "john@gmail.com" };
    expect(compareRecords(a, b).shouldMerge).toBe(true);
  });
});

describe("compareRecords — exact phone", () => {
  it("formatted phones match after normalization", () => {
    const a: PersonRecord = { id: "a", phoneE164: "(415) 555-1212" };
    const b: PersonRecord = { id: "b", phoneE164: "+1-415.555.1212" };
    const c = compareRecords(a, b);
    expect(c.reasons.some((r) => r.code === "exact_phone")).toBe(true);
  });
});

describe("compareRecords — name + domain", () => {
  it("same name + same work domain → merge", () => {
    const a: PersonRecord = { id: "a", fullName: "Jane Doe", companyDomain: "acme.com" };
    const b: PersonRecord = { id: "b", fullName: "jane doe", companyDomain: "www.acme.com" };
    const c = compareRecords(a, b);
    expect(c.reasons.some((r) => r.code === "exact_name_and_domain")).toBe(true);
    expect(c.shouldMerge).toBe(true);
  });

  it("fuzzy name + same domain under threshold → likely but not auto-merge", () => {
    const a: PersonRecord = { id: "a", fullName: "Jonathan Doe", companyDomain: "acme.com" };
    const b: PersonRecord = { id: "b", fullName: "Jon Doe", companyDomain: "acme.com" };
    const c = compareRecords(a, b);
    expect(c.reasons.length).toBeGreaterThan(0);
  });

  it("same free-mail domain does NOT auto-match as work domain", () => {
    const a: PersonRecord = { id: "a", fullName: "Jane Doe", email: "jane@gmail.com" };
    const b: PersonRecord = { id: "b", fullName: "Jane Doe", email: "jane2@gmail.com" };
    const c = compareRecords(a, b);
    expect(c.shouldMerge).toBe(false);
  });
});

describe("compareRecords — LinkedIn", () => {
  it("matching LinkedIn slugs → merge", () => {
    const a: PersonRecord = {
      id: "a",
      linkedinUrl: "https://www.linkedin.com/in/jane-doe/",
    };
    const b: PersonRecord = {
      id: "b",
      linkedinUrl: "linkedin.com/in/jane-doe",
    };
    const c = compareRecords(a, b);
    expect(c.shouldMerge).toBe(true);
    expect(c.reasons.some((r) => r.code === "exact_linkedin")).toBe(true);
  });
});

describe("compareRecords — disagreement downweighting", () => {
  it("same email + wildly different names → penalize to shared-mailbox level", () => {
    const a: PersonRecord = {
      id: "a",
      fullName: "Sales Team",
      email: "sales@acme.com",
    };
    const b: PersonRecord = {
      id: "b",
      fullName: "Jane Doe",
      email: "sales@acme.com",
    };
    const c = compareRecords(a, b);
    expect(c.confidence).toBeLessThanOrEqual(0.7);
    expect(c.reasons.some((r) => r.code === "same_company_different_person")).toBe(true);
  });
});

describe("compareRecords — primary selection by sourceWeight", () => {
  it("higher sourceWeight becomes primary", () => {
    const a: PersonRecord = { id: "a", email: "x@acme.com", sourceWeight: 1 };
    const b: PersonRecord = { id: "b", email: "x@acme.com", sourceWeight: 10 };
    const c = compareRecords(a, b);
    expect(c.primaryId).toBe("b");
    expect(c.duplicateId).toBe("a");
  });
});

describe("findDuplicates + clusterRecords", () => {
  it("clusters three records that share email/phone into one group", () => {
    const recs: PersonRecord[] = [
      { id: "r1", email: "jane@acme.com" },
      { id: "r2", phoneE164: "+14155551212", email: "jane@acme.com" },
      { id: "r3", phoneE164: "+1-415-555-1212" },
      { id: "r4", email: "bob@other.com" },
    ];
    const dupes = findDuplicates(recs);
    expect(dupes.length).toBeGreaterThanOrEqual(2);
    const clusters = clusterRecords(recs);
    expect(clusters.length).toBe(1);
    expect(clusters[0].ids.sort()).toEqual(["r1", "r2", "r3"]);
  });

  it("does not cluster unrelated records", () => {
    const recs: PersonRecord[] = [
      { id: "a", email: "a@acme.com" },
      { id: "b", email: "b@acme.com" },
    ];
    expect(clusterRecords(recs)).toEqual([]);
  });
});
