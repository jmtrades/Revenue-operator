/**
 * Phase 13e — Expanded industry packs.
 */

import { describe, it, expect } from "vitest";
import {
  INDUSTRY_PACKS,
  INDUSTRY_ALIASES,
  resolveIndustryPack,
} from "../src/lib/industry-packs";

const NEW_PACK_IDS = [
  "auto_dealership",
  "saas",
  "nonprofit",
  "moving",
  "senior_care",
  "mental_health",
  "catering",
  "childcare",
];

describe("industry-packs — Phase 13e new packs", () => {
  it("registers every new pack under its canonical id", () => {
    for (const id of NEW_PACK_IDS) {
      expect(INDUSTRY_PACKS[id]).toBeDefined();
      expect(INDUSTRY_PACKS[id].id).toBe(id);
    }
  });

  it("every new pack has required fields populated", () => {
    for (const id of NEW_PACK_IDS) {
      const p = INDUSTRY_PACKS[id];
      expect(p.name.length).toBeGreaterThan(0);
      expect(p.greeting.length).toBeGreaterThan(0);
      expect(p.avgJobValue).toBeGreaterThan(0);
      expect(p.appointmentTypes.length).toBeGreaterThan(0);
      expect(p.knowledgeBase.services.length).toBeGreaterThan(0);
      expect(p.knowledgeBase.commonQuestions.length).toBeGreaterThan(0);
      expect(p.inboundWorkflows.length).toBeGreaterThan(0);
      expect(p.outboundCampaigns.length).toBeGreaterThan(0);
    }
  });

  it("every new pack's appointment types have positive duration", () => {
    for (const id of NEW_PACK_IDS) {
      const p = INDUSTRY_PACKS[id];
      for (const apt of p.appointmentTypes) {
        expect(apt.duration).toBeGreaterThan(0);
        expect(apt.name.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("industry-packs — Phase 13e aliases", () => {
  it("auto dealership aliases resolve", () => {
    for (const raw of ["dealership", "car_dealership", "new_cars", "used_cars"]) {
      expect(INDUSTRY_ALIASES[raw]).toBe("auto_dealership");
    }
  });

  it("SaaS aliases resolve", () => {
    for (const raw of ["software", "b2b_software", "tech_company", "startup"]) {
      expect(INDUSTRY_ALIASES[raw]).toBe("saas");
    }
  });

  it("nonprofit aliases resolve", () => {
    for (const raw of ["charity", "501c3", "foundation", "ngo"]) {
      expect(INDUSTRY_ALIASES[raw]).toBe("nonprofit");
    }
  });

  it("moving aliases resolve", () => {
    for (const raw of ["movers", "moving_company", "storage", "relocation"]) {
      expect(INDUSTRY_ALIASES[raw]).toBe("moving");
    }
  });

  it("senior care aliases resolve", () => {
    for (const raw of [
      "elder_care",
      "assisted_living",
      "nursing_home",
      "memory_care",
      "home_health",
    ]) {
      expect(INDUSTRY_ALIASES[raw]).toBe("senior_care");
    }
  });

  it("mental health aliases resolve", () => {
    for (const raw of [
      "therapy",
      "therapist",
      "counselor",
      "counseling",
      "psychologist",
      "psychiatrist",
    ]) {
      expect(INDUSTRY_ALIASES[raw]).toBe("mental_health");
    }
  });

  it("catering aliases resolve", () => {
    for (const raw of ["caterer", "food_catering", "event_catering"]) {
      expect(INDUSTRY_ALIASES[raw]).toBe("catering");
    }
  });

  it("childcare aliases resolve", () => {
    for (const raw of [
      "daycare",
      "preschool",
      "after_school",
      "montessori",
      "early_learning",
    ]) {
      expect(INDUSTRY_ALIASES[raw]).toBe("childcare");
    }
  });
});

describe("industry-packs — resolveIndustryPack", () => {
  it("resolves every new pack id directly", () => {
    for (const id of NEW_PACK_IDS) {
      expect(resolveIndustryPack(id).id).toBe(id);
    }
  });

  it("resolves through aliases", () => {
    expect(resolveIndustryPack("dealership").id).toBe("auto_dealership");
    expect(resolveIndustryPack("software").id).toBe("saas");
    expect(resolveIndustryPack("charity").id).toBe("nonprofit");
    expect(resolveIndustryPack("movers").id).toBe("moving");
    expect(resolveIndustryPack("elder care").id).toBe("senior_care");
    expect(resolveIndustryPack("therapy").id).toBe("mental_health");
    expect(resolveIndustryPack("caterer").id).toBe("catering");
    expect(resolveIndustryPack("daycare").id).toBe("childcare");
  });

  it("falls back to general for unknown", () => {
    expect(resolveIndustryPack("completely_made_up").id).toBe("general");
  });
});

describe("industry-packs — total coverage", () => {
  it("has at least 40 distinct industry packs after Phase 13e", () => {
    expect(Object.keys(INDUSTRY_PACKS).length).toBeGreaterThanOrEqual(40);
  });

  it("has no duplicate pack ids", () => {
    const ids = Object.values(INDUSTRY_PACKS).map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
