import { dentalPack } from "./dental";
import { legalPack } from "./legal";
import { hvacPack } from "./hvac";
import { medspaPack } from "./medspa";
import { roofingPack } from "./roofing";
import { generalPack } from "./general";
import { realEstatePack } from "./real-estate";
import { insurancePack } from "./insurance";
import { autoRepairPack } from "./auto-repair";
import { solarPack } from "./solar";
import { fitnessPack } from "./fitness";
import { restaurantPack } from "./restaurant";
import { homeServicesPack } from "./home-services";
import { healthcarePack } from "./healthcare";
import { accountingPack } from "./accounting";
import { veterinaryPack } from "./veterinary";
import { contractorPack } from "./contractor";
import { plumbingPack } from "./plumbing";
import { electricalPack } from "./electrical";
import { propertyManagementPack } from "./property-management";
import { ecommercePack } from "./ecommerce";
import { educationPack } from "./education";
import { financialServicesPack } from "./financial-services";
import { beautySalonPack } from "./beauty-salon";
import { photographyPack } from "./photography";
import { petGroomingPack } from "./pet-grooming";
import { chiropractorPack } from "./chiropractor";
import { pharmacyPack } from "./pharmacy";
import { travelPack } from "./travel";
import { recruitingPack } from "./recruiting";
import { cleaningPack } from "./cleaning";
import { landscapingPack } from "./landscaping";
// Phase 13e — expanded industry coverage
import { autoDealershipPack } from "./auto-dealership";
import { saasPack } from "./saas";
import { nonprofitPack } from "./nonprofit";
import { movingPack } from "./moving";
import { seniorCarePack } from "./senior-care";
import { mentalHealthPack } from "./mental-health";
import { cateringPack } from "./catering";
import { childcarePack } from "./childcare";
import type { IndustryPack } from "./types";

export const INDUSTRY_PACKS: Record<string, IndustryPack> = {
  dental: dentalPack,
  legal: legalPack,
  hvac: hvacPack,
  medspa: medspaPack,
  roofing: roofingPack,
  general: generalPack,
  real_estate: realEstatePack,
  insurance: insurancePack,
  auto_repair: autoRepairPack,
  solar: solarPack,
  fitness: fitnessPack,
  restaurant: restaurantPack,
  home_services: homeServicesPack,
  healthcare: healthcarePack,
  accounting: accountingPack,
  veterinary: veterinaryPack,
  contractor: contractorPack,
  plumbing: plumbingPack,
  electrical: electricalPack,
  property_management: propertyManagementPack,
  ecommerce: ecommercePack,
  education: educationPack,
  financial_services: financialServicesPack,
  beauty_salon: beautySalonPack,
  photography: photographyPack,
  pet_grooming: petGroomingPack,
  chiropractor: chiropractorPack,
  pharmacy: pharmacyPack,
  travel: travelPack,
  recruiting: recruitingPack,
  cleaning: cleaningPack,
  landscaping: landscapingPack,
  // Phase 13e — expanded coverage
  auto_dealership: autoDealershipPack,
  saas: saasPack,
  nonprofit: nonprofitPack,
  moving: movingPack,
  senior_care: seniorCarePack,
  mental_health: mentalHealthPack,
  catering: cateringPack,
  childcare: childcarePack,
};

/** Common aliases — normalize user-entered strings to pack IDs */
export const INDUSTRY_ALIASES: Record<string, string> = {
  dentist: "dental",
  lawyer: "legal",
  law_firm: "legal",
  attorney: "legal",
  "heating_and_cooling": "hvac",
  "air_conditioning": "hvac",
  med_spa: "medspa",
  medical_spa: "medspa",
  roof: "roofing",
  realtor: "real_estate",
  real_estate_agent: "real_estate",
  mechanic: "auto_repair",
  auto_shop: "auto_repair",
  car_repair: "auto_repair",
  solar_panel: "solar",
  solar_energy: "solar",
  gym: "fitness",
  health_club: "fitness",
  personal_training: "fitness",
  cafe: "restaurant",
  bar: "restaurant",
  food_service: "restaurant",
  handyman: "home_services",
  home_repair: "home_services",
  doctor: "healthcare",
  clinic: "healthcare",
  medical: "healthcare",
  hospital: "healthcare",
  urgent_care: "healthcare",
  cpa: "accounting",
  tax: "accounting",
  bookkeeper: "accounting",
  vet: "veterinary",
  animal_hospital: "veterinary",
  construction: "contractor",
  general_contractor: "contractor",
  builder: "contractor",
  plumber: "plumbing",
  electrician: "electrical",
  apartment: "property_management",
  landlord: "property_management",
  rental: "property_management",
  online_store: "ecommerce",
  shopify: "ecommerce",
  school: "education",
  tutor: "education",
  tutoring: "education",
  university: "education",
  finance: "financial_services",
  wealth_management: "financial_services",
  financial_advisor: "financial_services",
  hair_salon: "beauty_salon",
  barbershop: "beauty_salon",
  nail_salon: "beauty_salon",
  spa: "beauty_salon",
  photographer: "photography",
  photo_studio: "photography",
  videography: "photography",
  dog_grooming: "pet_grooming",
  pet_salon: "pet_grooming",
  chiro: "chiropractor",
  drugstore: "pharmacy",
  rx: "pharmacy",
  travel_agent: "travel",
  tour: "travel",
  staffing: "recruiting",
  headhunter: "recruiting",
  employment_agency: "recruiting",
  maid_service: "cleaning",
  janitorial: "cleaning",
  house_cleaning: "cleaning",
  lawn_care: "landscaping",
  yard_maintenance: "landscaping",
  tree_service: "landscaping",
  // Phase 13e aliases
  dealership: "auto_dealership",
  car_dealership: "auto_dealership",
  new_cars: "auto_dealership",
  used_cars: "auto_dealership",
  software: "saas",
  b2b_software: "saas",
  tech_company: "saas",
  startup: "saas",
  charity: "nonprofit",
  "501c3": "nonprofit",
  foundation: "nonprofit",
  ngo: "nonprofit",
  movers: "moving",
  moving_company: "moving",
  storage: "moving",
  relocation: "moving",
  elder_care: "senior_care",
  assisted_living: "senior_care",
  nursing_home: "senior_care",
  memory_care: "senior_care",
  home_health: "senior_care",
  therapy: "mental_health",
  therapist: "mental_health",
  counselor: "mental_health",
  counseling: "mental_health",
  psychologist: "mental_health",
  psychiatrist: "mental_health",
  caterer: "catering",
  food_catering: "catering",
  event_catering: "catering",
  daycare: "childcare",
  preschool: "childcare",
  after_school: "childcare",
  montessori: "childcare",
  early_learning: "childcare",
};

/**
 * Look up an industry pack by name, with alias normalization.
 * Falls back to "general" if nothing matches.
 */
export function resolveIndustryPack(raw: string): IndustryPack {
  const key = raw.toLowerCase().replace(/[\s\-]+/g, "_").trim();
  const directMatch = INDUSTRY_PACKS[key];
  if (directMatch) return directMatch;
  const alias = INDUSTRY_ALIASES[key];
  if (alias && INDUSTRY_PACKS[alias]) return INDUSTRY_PACKS[alias];
  return INDUSTRY_PACKS["general"];
}

export type IndustryPackId = keyof typeof INDUSTRY_PACKS;
export type { IndustryPack } from "./types";
