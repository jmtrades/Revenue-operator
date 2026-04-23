/**
 * Phase 24 — Federal + state DNC scrub orchestrator.
 */

import { describe, it, expect } from "vitest";
import {
  scrubNumber,
  scrubBatch,
  summarizeScrub,
  type DncLookupTables,
  type DncScrubConfig,
} from "../src/lib/compliance/dnc-scrub";

function tables(overrides: Partial<DncLookupTables> = {}): DncLookupTables {
  return {
    ftcNational: new Set(),
    fccWireless: new Set(),
    stateDnc: new Map(),
    workspaceSuppression: new Set(),
    litigators: new Set(),
    reassignedAfter: new Map(),
    ...overrides,
  };
}

function cfg(overrides: Partial<DncScrubConfig> = {}): DncScrubConfig {
  return {
    enforceStates: [],
    ebrNumbers: new Set(),
    writtenConsent: new Set(),
    isTelemarketing: true,
    nowUtc: "2026-04-22T12:00:00.000Z",
    ...overrides,
  };
}

describe("scrubNumber — clean", () => {
  it("allows numbers on no list", () => {
    const r = scrubNumber("+14155551212", tables(), cfg());
    expect(r.allowed).toBe(true);
    expect(r.sources).toEqual([]);
    expect(r.reason).toBe("clean");
  });

  it("normalizes 10-digit US input", () => {
    const r = scrubNumber("4155551212", tables(), cfg());
    expect(r.e164).toBe("+14155551212");
    expect(r.allowed).toBe(true);
  });

  it("normalizes 11-digit US input", () => {
    const r = scrubNumber("14155551212", tables(), cfg());
    expect(r.e164).toBe("+14155551212");
  });

  it("rejects invalid input", () => {
    const r = scrubNumber("notaphone", tables(), cfg());
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe("invalid_e164");
  });
});

describe("scrubNumber — federal DNC", () => {
  it("blocks FTC national DNC for telemarketing", () => {
    const r = scrubNumber(
      "+14155551212",
      tables({ ftcNational: new Set(["+14155551212"]) }),
      cfg(),
    );
    expect(r.allowed).toBe(false);
    expect(r.sources).toContain("ftc_national");
  });

  it("allows FTC DNC override via written consent", () => {
    const r = scrubNumber(
      "+14155551212",
      tables({ ftcNational: new Set(["+14155551212"]) }),
      cfg({ writtenConsent: new Set(["+14155551212"]) }),
    );
    expect(r.allowed).toBe(true);
    expect(r.overrides).toContain("written_consent");
  });

  it("allows FTC DNC override via EBR for non-wireless", () => {
    const r = scrubNumber(
      "+14155551212",
      tables({ ftcNational: new Set(["+14155551212"]) }),
      cfg({ ebrNumbers: new Set(["+14155551212"]) }),
    );
    expect(r.allowed).toBe(true);
    expect(r.overrides).toContain("ebr");
  });

  it("allows any DNC-listed number when call is non-telemarketing", () => {
    const r = scrubNumber(
      "+14155551212",
      tables({ ftcNational: new Set(["+14155551212"]) }),
      cfg({ isTelemarketing: false }),
    );
    expect(r.allowed).toBe(true);
    expect(r.overrides).toContain("non_telemarketing");
  });
});

describe("scrubNumber — FCC wireless", () => {
  it("blocks wireless telemarketing absent written consent (EBR not enough)", () => {
    const r = scrubNumber(
      "+14155551212",
      tables({ fccWireless: new Set(["+14155551212"]) }),
      cfg({ ebrNumbers: new Set(["+14155551212"]) }),
    );
    expect(r.allowed).toBe(false);
    expect(r.reason).toMatch(/wireless_requires_written_consent/);
  });

  it("allows wireless with written consent", () => {
    const r = scrubNumber(
      "+14155551212",
      tables({ fccWireless: new Set(["+14155551212"]) }),
      cfg({ writtenConsent: new Set(["+14155551212"]) }),
    );
    expect(r.allowed).toBe(true);
  });

  it("allows wireless when call is non-telemarketing", () => {
    const r = scrubNumber(
      "+14155551212",
      tables({ fccWireless: new Set(["+14155551212"]) }),
      cfg({ isTelemarketing: false }),
    );
    expect(r.allowed).toBe(true);
  });
});

describe("scrubNumber — state DNC", () => {
  it("blocks based on caller's workspace state DNC", () => {
    const r = scrubNumber(
      "+14155551212",
      tables({
        stateDnc: new Map([["CA", new Set(["+14155551212"])]]),
      }),
      cfg({ workspaceState: "CA" }),
    );
    expect(r.allowed).toBe(false);
    expect(r.sources).toContain("state");
  });

  it("blocks based on enforceStates even without workspaceState", () => {
    const r = scrubNumber(
      "+14155551212",
      tables({
        stateDnc: new Map([["FL", new Set(["+14155551212"])]]),
      }),
      cfg({ enforceStates: ["FL"] }),
    );
    expect(r.allowed).toBe(false);
  });

  it("ignores state DNC not in enforceStates", () => {
    const r = scrubNumber(
      "+14155551212",
      tables({
        stateDnc: new Map([["TX", new Set(["+14155551212"])]]),
      }),
      cfg({ workspaceState: "CA", enforceStates: [] }),
    );
    expect(r.allowed).toBe(true);
  });
});

describe("scrubNumber — litigators + reassigned", () => {
  it("always blocks litigators — no overrides allowed", () => {
    const r = scrubNumber(
      "+14155551212",
      tables({ litigators: new Set(["+14155551212"]) }),
      cfg({
        writtenConsent: new Set(["+14155551212"]),
        ebrNumbers: new Set(["+14155551212"]),
        isTelemarketing: false,
      }),
    );
    expect(r.allowed).toBe(false);
    expect(r.sources).toEqual(["litigator"]);
  });

  it("blocks reassigned numbers even with consent", () => {
    const r = scrubNumber(
      "+14155551212",
      tables({
        reassignedAfter: new Map([["+14155551212", "2026-04-25T00:00:00Z"]]),
      }),
      cfg({
        writtenConsent: new Set(["+14155551212"]),
        nowUtc: "2026-04-22T12:00:00.000Z",
      }),
    );
    expect(r.allowed).toBe(false);
    expect(r.sources).toEqual(["reassigned"]);
  });

  it("allows reassigned numbers when reassignment is in the past", () => {
    const r = scrubNumber(
      "+14155551212",
      tables({
        reassignedAfter: new Map([["+14155551212", "2025-01-01T00:00:00Z"]]),
      }),
      cfg({ nowUtc: "2026-04-22T12:00:00.000Z" }),
    );
    expect(r.allowed).toBe(true);
  });
});

describe("scrubNumber — workspace suppression", () => {
  it("blocks on internal opt-out list", () => {
    const r = scrubNumber(
      "+14155551212",
      tables({ workspaceSuppression: new Set(["+14155551212"]) }),
      cfg(),
    );
    expect(r.allowed).toBe(false);
    expect(r.sources).toEqual(["workspace"]);
  });

  it("even written consent doesn't override internal opt-out", () => {
    const r = scrubNumber(
      "+14155551212",
      tables({ workspaceSuppression: new Set(["+14155551212"]) }),
      cfg({ writtenConsent: new Set(["+14155551212"]) }),
    );
    expect(r.allowed).toBe(false);
  });
});

describe("scrubBatch + summarizeScrub", () => {
  it("processes a batch", () => {
    const results = scrubBatch(
      ["+14155551212", "+14155551213", "+14155551214"],
      tables({
        ftcNational: new Set(["+14155551213"]),
        workspaceSuppression: new Set(["+14155551214"]),
      }),
      cfg(),
    );
    expect(results.length).toBe(3);
    expect(results[0].allowed).toBe(true);
    expect(results[1].allowed).toBe(false);
    expect(results[2].allowed).toBe(false);
  });

  it("summarizes results", () => {
    const results = scrubBatch(
      ["+14155551212", "+14155551213", "+14155551214"],
      tables({
        ftcNational: new Set(["+14155551213"]),
        workspaceSuppression: new Set(["+14155551214"]),
      }),
      cfg(),
    );
    const sum = summarizeScrub(results);
    expect(sum.totalCount).toBe(3);
    expect(sum.allowedCount).toBe(1);
    expect(sum.blockedCount).toBe(2);
    expect(sum.bySource.ftc_national).toBe(1);
    expect(sum.bySource.workspace).toBe(1);
  });
});
