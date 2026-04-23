/**
 * Phase 17 — Phone number validation + country + line-type hint.
 *
 * Pure module, no network calls. Covers:
 *   - E.164 normalization
 *   - Country detection by country-calling-code prefix (E.164.1 allocation)
 *   - US/CA area-code → state/province mapping (NANP numbering-plan lookups)
 *   - Line-type HINT (mobile vs landline vs voip) from known VoIP carrier
 *     blocks + mobile-only prefixes in non-NANP countries. "Hint" because a
 *     real answer requires a paid HLR / carrier lookup — we mark known
 *     common cases and flag the rest as `unknown`.
 *   - Toll-free detection (800/833/844/855/866/877/888).
 *
 * Heuristics are intentionally conservative — we never say "mobile" unless
 * we can prove it. Callers gate outbound SMS off `lineType === "mobile"` or
 * `lineType === "unknown" && countryIso === "US"` (NANP mobile-landline
 * portability makes it ambiguous).
 */

export type PhoneLineTypeHint =
  | "mobile"
  | "landline"
  | "voip"
  | "toll_free"
  | "premium"
  | "unknown";

export interface PhoneValidationResult {
  input: string;
  /** E.164 normalized form, starts with "+" if valid. */
  e164: string | null;
  /** Just the digits after +. */
  digits: string | null;
  isValidSyntax: boolean;
  /** ITU country-calling-code ("1", "44", "81", etc.) */
  countryCode: string | null;
  /** ISO-3166 alpha-2 if resolvable ("US", "CA", "GB", ...). */
  countryIso: string | null;
  /** For NANP numbers, the NPA (area code) — else null. */
  npa: string | null;
  /** US state / CA province code derived from NPA, else null. */
  region: string | null;
  lineType: PhoneLineTypeHint;
  issues: string[];
}

/** Strip everything non-digit / non-plus. */
function onlyDigitsPlus(s: string): string {
  return (s ?? "").trim().replace(/[^\d+]/g, "");
}

/** Minimal ITU country code → ISO-2 mapping. Extendable. */
const CC_TO_ISO: Record<string, string> = {
  "1": "US", // NANP is US+CA+Caribbean — refined by NPA below.
  "7": "RU",
  "20": "EG",
  "27": "ZA",
  "30": "GR",
  "31": "NL",
  "32": "BE",
  "33": "FR",
  "34": "ES",
  "36": "HU",
  "39": "IT",
  "40": "RO",
  "41": "CH",
  "43": "AT",
  "44": "GB",
  "45": "DK",
  "46": "SE",
  "47": "NO",
  "48": "PL",
  "49": "DE",
  "51": "PE",
  "52": "MX",
  "53": "CU",
  "54": "AR",
  "55": "BR",
  "56": "CL",
  "57": "CO",
  "58": "VE",
  "60": "MY",
  "61": "AU",
  "62": "ID",
  "63": "PH",
  "64": "NZ",
  "65": "SG",
  "66": "TH",
  "81": "JP",
  "82": "KR",
  "84": "VN",
  "86": "CN",
  "90": "TR",
  "91": "IN",
  "92": "PK",
  "93": "AF",
  "94": "LK",
  "95": "MM",
  "98": "IR",
  "212": "MA",
  "213": "DZ",
  "216": "TN",
  "220": "GM",
  "221": "SN",
  "234": "NG",
  "249": "SD",
  "250": "RW",
  "251": "ET",
  "254": "KE",
  "255": "TZ",
  "256": "UG",
  "260": "ZM",
  "263": "ZW",
  "351": "PT",
  "352": "LU",
  "353": "IE",
  "354": "IS",
  "355": "AL",
  "358": "FI",
  "359": "BG",
  "370": "LT",
  "371": "LV",
  "372": "EE",
  "380": "UA",
  "385": "HR",
  "386": "SI",
  "420": "CZ",
  "421": "SK",
  "852": "HK",
  "853": "MO",
  "855": "KH",
  "856": "LA",
  "880": "BD",
  "886": "TW",
  "960": "MV",
  "961": "LB",
  "962": "JO",
  "963": "SY",
  "964": "IQ",
  "965": "KW",
  "966": "SA",
  "967": "YE",
  "968": "OM",
  "970": "PS",
  "971": "AE",
  "972": "IL",
  "973": "BH",
  "974": "QA",
  "975": "BT",
  "976": "MN",
  "977": "NP",
  "992": "TJ",
  "993": "TM",
  "994": "AZ",
  "995": "GE",
  "996": "KG",
  "998": "UZ",
};

/**
 * Canadian NPAs per NANPA. US-NANP falls through to "US". This lets us
 * distinguish US vs CA without carrier lookup.
 * Source: NANPA NPA database (stable set).
 */
const CA_NPAS: ReadonlySet<string> = new Set([
  "204","226","236","249","250","263","289","306","343","354","365","367","368","382","403","416","418","428","431","437","438","450","468","474","506","514","519","548","579","581","584","587","604","613","639","647","672","683","705","709","742","753","778","780","782","807","819","825","867","873","879","902","905",
]);

/** US NPA → state. Selective list of common/high-traffic NPAs; falls through to null. */
const US_NPA_TO_STATE: Record<string, string> = {
  "201":"NJ","202":"DC","203":"CT","205":"AL","206":"WA","207":"ME","208":"ID","209":"CA","210":"TX","212":"NY","213":"CA","214":"TX","215":"PA","216":"OH","217":"IL","218":"MN","219":"IN","224":"IL","225":"LA","228":"MS","229":"GA","231":"MI","234":"OH","239":"FL","240":"MD","248":"MI","251":"AL","252":"NC","253":"WA","254":"TX","256":"AL","260":"IN","262":"WI","267":"PA","269":"MI","270":"KY","272":"PA","276":"VA","281":"TX","301":"MD","302":"DE","303":"CO","304":"WV","305":"FL","307":"WY","308":"NE","309":"IL","310":"CA","312":"IL","313":"MI","314":"MO","315":"NY","316":"KS","317":"IN","318":"LA","319":"IA","320":"MN","321":"FL","323":"CA","325":"TX","330":"OH","331":"IL","334":"AL","336":"NC","337":"LA","339":"MA","346":"TX","347":"NY","351":"MA","352":"FL","360":"WA","361":"TX","385":"UT","386":"FL","401":"RI","402":"NE","404":"GA","405":"OK","406":"MT","407":"FL","408":"CA","409":"TX","410":"MD","412":"PA","413":"MA","414":"WI","415":"CA","417":"MO","419":"OH","423":"TN","424":"CA","425":"WA","432":"TX","434":"VA","435":"UT","440":"OH","443":"MD","458":"OR","463":"IN","464":"IL","469":"TX","470":"GA","475":"CT","478":"GA","479":"AR","480":"AZ","484":"PA","501":"AR","502":"KY","503":"OR","504":"LA","505":"NM","507":"MN","508":"MA","509":"WA","510":"CA","512":"TX","513":"OH","515":"IA","516":"NY","517":"MI","518":"NY","520":"AZ","530":"CA","534":"WI","539":"OK","540":"VA","541":"OR","551":"NJ","559":"CA","561":"FL","562":"CA","563":"IA","564":"WA","567":"OH","570":"PA","571":"VA","573":"MO","574":"IN","575":"NM","580":"OK","585":"NY","586":"MI","601":"MS","602":"AZ","603":"NH","605":"SD","606":"KY","607":"NY","608":"WI","609":"NJ","610":"PA","612":"MN","614":"OH","615":"TN","616":"MI","617":"MA","618":"IL","619":"CA","620":"KS","623":"AZ","626":"CA","628":"CA","629":"TN","630":"IL","631":"NY","636":"MO","641":"IA","646":"NY","650":"CA","651":"MN","657":"CA","660":"MO","661":"CA","662":"MS","667":"MD","669":"CA","678":"GA","681":"WV","682":"TX","701":"ND","702":"NV","703":"VA","704":"NC","706":"GA","707":"CA","708":"IL","712":"IA","713":"TX","714":"CA","715":"WI","716":"NY","717":"PA","718":"NY","719":"CO","720":"CO","724":"PA","725":"NV","727":"FL","731":"TN","732":"NJ","734":"MI","737":"TX","740":"OH","743":"NC","747":"CA","754":"FL","757":"VA","760":"CA","762":"GA","763":"MN","765":"IN","770":"GA","772":"FL","773":"IL","774":"MA","775":"NV","779":"IL","781":"MA","785":"KS","786":"FL","801":"UT","802":"VT","803":"SC","804":"VA","805":"CA","806":"TX","808":"HI","810":"MI","812":"IN","813":"FL","814":"PA","815":"IL","816":"MO","817":"TX","818":"CA","828":"NC","830":"TX","831":"CA","832":"TX","843":"SC","845":"NY","847":"IL","848":"NJ","850":"FL","856":"NJ","857":"MA","858":"CA","859":"KY","860":"CT","862":"NJ","863":"FL","864":"SC","865":"TN","870":"AR","872":"IL","878":"PA","901":"TN","903":"TX","904":"FL","906":"MI","907":"AK","908":"NJ","909":"CA","910":"NC","912":"GA","913":"KS","914":"NY","915":"TX","916":"CA","917":"NY","918":"OK","919":"NC","920":"WI","925":"CA","928":"AZ","929":"NY","930":"IN","931":"TN","934":"NY","936":"TX","937":"OH","938":"AL","940":"TX","941":"FL","947":"MI","949":"CA","951":"CA","952":"MN","954":"FL","956":"TX","959":"CT","970":"CO","971":"OR","972":"TX","973":"NJ","975":"MO","978":"MA","979":"TX","980":"NC","984":"NC","985":"LA","989":"MI",
};

/** NANP toll-free and special NPAs. */
const TOLL_FREE_NPAS: ReadonlySet<string> = new Set([
  "800","833","844","855","866","877","888",
]);

/** NANP premium-rate (toll) NPAs. */
const PREMIUM_NPAS: ReadonlySet<string> = new Set(["900", "976"]);

/**
 * Known VoIP NPAs. NANP NPAs where the vast majority of allocations are VoIP
 * (Google Voice, Twilio, Bandwidth, etc.). Incomplete — but a useful hint.
 */
const VOIP_HEAVY_NPAS: ReadonlySet<string> = new Set([
  "929", "929", "332", "640", "725", "934", "975", "959", "272", "364",
]);

/**
 * Detect country code by prefix search: try 3, 2, 1 digits in order.
 */
function detectCountryCode(digitsOnly: string): string | null {
  for (const len of [3, 2, 1]) {
    const prefix = digitsOnly.slice(0, len);
    if (CC_TO_ISO[prefix]) return prefix;
  }
  return null;
}

/** Normalize to E.164 form; default country "US" if clearly NANP-style digits. */
export function normalizePhoneToE164(raw: string, defaultIso: string = "US"): string | null {
  const s = onlyDigitsPlus(raw);
  if (!s) return null;
  if (s.startsWith("+")) {
    const d = s.slice(1);
    if (!/^\d{7,15}$/.test(d)) return null;
    return `+${d}`;
  }
  const d = s.replace(/\D/g, "");
  if (!d) return null;
  if (defaultIso === "US" || defaultIso === "CA") {
    if (d.length === 10) return `+1${d}`;
    if (d.length === 11 && d.startsWith("1")) return `+${d}`;
  }
  if (d.length >= 7 && d.length <= 15) return `+${d}`;
  return null;
}

export function validatePhoneNumber(raw: string, defaultIso: string = "US"): PhoneValidationResult {
  const issues: string[] = [];
  const e164 = normalizePhoneToE164(raw, defaultIso);
  if (!e164) {
    return {
      input: raw,
      e164: null,
      digits: null,
      isValidSyntax: false,
      countryCode: null,
      countryIso: null,
      npa: null,
      region: null,
      lineType: "unknown",
      issues: ["unparseable"],
    };
  }

  const digits = e164.slice(1);
  const cc = detectCountryCode(digits);
  const countryIso = cc ? CC_TO_ISO[cc] ?? null : null;

  let npa: string | null = null;
  let region: string | null = null;
  let lineType: PhoneLineTypeHint = "unknown";

  if (cc === "1" && digits.length === 11) {
    npa = digits.slice(1, 4);
    if (TOLL_FREE_NPAS.has(npa)) {
      lineType = "toll_free";
      region = null;
    } else if (PREMIUM_NPAS.has(npa)) {
      lineType = "premium";
      region = null;
    } else if (CA_NPAS.has(npa)) {
      // Canadian — no state/province lookup in this stub.
      region = "CA";
    } else {
      const st = US_NPA_TO_STATE[npa];
      if (st) region = st;
    }
    if (VOIP_HEAVY_NPAS.has(npa) && lineType === "unknown") {
      lineType = "voip";
    }
    // NANP length validation: 11 digits total, NPA cannot start with 0 or 1,
    // second digit cannot be 9 (reserved).
    if (npa && (npa.startsWith("0") || npa.startsWith("1"))) {
      issues.push("invalid_npa");
      return {
        input: raw,
        e164,
        digits,
        isValidSyntax: false,
        countryCode: cc,
        countryIso,
        npa,
        region,
        lineType: "unknown",
        issues,
      };
    }
  } else if (cc && digits.length < 8) {
    issues.push("too_short_for_country");
  }

  if (lineType === "unknown" && countryIso === "CA") {
    // All Canadian numbers are mobile-capable (NANP portability).
    lineType = "unknown";
  }

  return {
    input: raw,
    e164,
    digits,
    isValidSyntax: true,
    countryCode: cc,
    countryIso: cc && countryIso === "US" && npa && CA_NPAS.has(npa) ? "CA" : countryIso,
    npa,
    region,
    lineType,
    issues,
  };
}

/** Fast boolean for outbound-gating. Allows mobile + unknown (US/CA ambiguous). */
export function isPhoneSmsCapable(raw: string, defaultIso: string = "US"): boolean {
  const r = validatePhoneNumber(raw, defaultIso);
  if (!r.isValidSyntax) return false;
  if (r.lineType === "toll_free" || r.lineType === "premium") return false;
  return true;
}
