import { dentalPack } from "./dental";
import { legalPack } from "./legal";
import { hvacPack } from "./hvac";
import { medspaPack } from "./medspa";
import { roofingPack } from "./roofing";
import { generalPack } from "./general";
import type { IndustryPack } from "./types";

export const INDUSTRY_PACKS: Record<string, IndustryPack> = {
  dental: dentalPack,
  legal: legalPack,
  hvac: hvacPack,
  medspa: medspaPack,
  roofing: roofingPack,
  general: generalPack,
};

export type IndustryPackId = keyof typeof INDUSTRY_PACKS;
export type { IndustryPack } from "./types";
