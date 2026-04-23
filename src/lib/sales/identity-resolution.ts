/**
 * Phase 35 — Lead dedup / identity resolution.
 *
 * Fuzzy merge plan for records that could be the same person or the same
 * account. Built for the "CSV import came in and the CRM already has these"
 * case, plus cross-channel identity (email vs. phone vs. LinkedIn URL vs.
 * website domain).
 *
 * Strategy:
 *   1. Normalize every identity signal (lowercase, strip punctuation, fold
 *      common domain aliases).
 *   2. Apply a graduated match ladder: exact email > exact phone E.164 >
 *      same work email domain + same normalized name > fuzzy name similarity.
 *   3. Produce confidence score + merge plan with reasons.
 *
 * Pure. No DB — caller loads candidates and gets back cluster assignments.
 */

export interface PersonRecord {
  id: string;
  fullName?: string | null;
  email?: string | null;
  phoneE164?: string | null;
  linkedinUrl?: string | null;
  companyName?: string | null;
  companyDomain?: string | null;
  title?: string | null;
  /** Optional "source of truth" weight — higher = more authoritative. */
  sourceWeight?: number;
}

export interface MatchReason {
  code:
    | "exact_email"
    | "exact_phone"
    | "exact_linkedin"
    | "exact_name_and_domain"
    | "fuzzy_name_and_domain"
    | "same_company_different_person";
  confidence: number; // 0..1
  detail: string;
}

export interface MergeCandidate {
  primaryId: string;
  duplicateId: string;
  confidence: number;
  shouldMerge: boolean; // confidence >= 0.85
  reasons: MatchReason[];
}

// ---------- Normalizers ----------

const DISPOSABLE_ALIAS_DOMAINS = new Set([
  "gmail.com", "googlemail.com",
  "hotmail.com", "live.com", "outlook.com",
  "yahoo.com", "ymail.com", "rocketmail.com",
]);

export function normalizeName(name: string | null | undefined): string {
  if (!name) return "";
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .replace(/[^a-z\s'-]/g, "")
    .replace(/\b(mr|mrs|ms|dr|prof|sr|jr|ii|iii|iv)\b\.?/g, "")
    .trim()
    .replace(/\s+/g, " ");
}

export function normalizeEmail(email: string | null | undefined): string {
  if (!email) return "";
  const trimmed = email.toLowerCase().trim();
  if (!trimmed.includes("@")) return trimmed;
  const [local, domain] = trimmed.split("@");
  // Drop +tags for gmail/googlemail; treat googlemail.com as gmail.com.
  let normalLocal = local;
  let normalDomain = domain;
  if (domain === "googlemail.com") normalDomain = "gmail.com";
  if (normalDomain === "gmail.com") {
    normalLocal = normalLocal.split("+")[0].replace(/\./g, "");
  } else {
    normalLocal = normalLocal.split("+")[0];
  }
  return `${normalLocal}@${normalDomain}`;
}

export function isFreeMailDomain(domain: string): boolean {
  return DISPOSABLE_ALIAS_DOMAINS.has(domain.toLowerCase());
}

export function extractDomain(email: string | null | undefined): string {
  if (!email || !email.includes("@")) return "";
  return email.split("@")[1].toLowerCase().trim();
}

export function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return "";
  const raw = phone.trim();
  const hadPlus = raw.startsWith("+");
  const digits = raw.replace(/[^\d]/g, "");
  if (digits.length === 0) return "";
  // NANP friendliness: if 10 digits with no leading +, assume US/CA (+1).
  if (!hadPlus && digits.length === 10) return `+1${digits}`;
  if (!hadPlus && digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return `+${digits}`;
}

export function normalizeDomain(domain: string | null | undefined): string {
  if (!domain) return "";
  return domain
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0];
}

export function normalizeLinkedin(url: string | null | undefined): string {
  if (!url) return "";
  const lower = url.toLowerCase().trim();
  const match = lower.match(/linkedin\.com\/in\/([^\/?#]+)/);
  return match ? match[1].replace(/\/$/, "") : "";
}

// ---------- Similarity ----------

/**
 * Levenshtein edit distance, bounded to short strings (<=100 chars).
 */
function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const prev = new Array<number>(b.length + 1);
  const cur = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    cur[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      cur[j] = Math.min(
        cur[j - 1] + 1,
        prev[j] + 1,
        prev[j - 1] + cost,
      );
    }
    for (let j = 0; j <= b.length; j++) prev[j] = cur[j];
  }
  return prev[b.length];
}

/** Normalized Jaro-Winkler-ish similarity [0..1] based on edit distance. */
export function nameSimilarity(a: string, b: string): number {
  const an = normalizeName(a);
  const bn = normalizeName(b);
  if (!an || !bn) return 0;
  if (an === bn) return 1;

  // Compare tokens — same tokens in any order is high similarity.
  const ta = new Set(an.split(" ").filter(Boolean));
  const tb = new Set(bn.split(" ").filter(Boolean));
  const overlap = [...ta].filter((t) => tb.has(t)).length;
  const tokenJaccard = overlap / Math.max(ta.size, tb.size);

  // Edit distance on full strings.
  const d = editDistance(an, bn);
  const maxLen = Math.max(an.length, bn.length);
  const editSim = 1 - d / maxLen;

  return Math.max(tokenJaccard, editSim);
}

// ---------- Match Ladder ----------

export function compareRecords(a: PersonRecord, b: PersonRecord): MergeCandidate {
  const reasons: MatchReason[] = [];
  let confidence = 0;

  // 1. Exact email (normalized).
  const ea = normalizeEmail(a.email);
  const eb = normalizeEmail(b.email);
  if (ea && eb && ea === eb) {
    reasons.push({
      code: "exact_email",
      confidence: 0.98,
      detail: `Matching email: ${ea}`,
    });
    confidence = Math.max(confidence, 0.98);
  }

  // 2. Exact phone E.164.
  const pa = normalizePhone(a.phoneE164);
  const pb = normalizePhone(b.phoneE164);
  if (pa && pb && pa === pb && pa.length >= 8) {
    reasons.push({
      code: "exact_phone",
      confidence: 0.93,
      detail: `Matching phone: ${pa}`,
    });
    confidence = Math.max(confidence, 0.93);
  }

  // 3. Exact LinkedIn slug.
  const la = normalizeLinkedin(a.linkedinUrl);
  const lb = normalizeLinkedin(b.linkedinUrl);
  if (la && lb && la === lb) {
    reasons.push({
      code: "exact_linkedin",
      confidence: 0.97,
      detail: `Matching LinkedIn: ${la}`,
    });
    confidence = Math.max(confidence, 0.97);
  }

  // 4. Same normalized name + same work email domain.
  const na = normalizeName(a.fullName);
  const nb = normalizeName(b.fullName);
  const da = normalizeDomain(a.companyDomain) || extractDomain(a.email ?? "");
  const db = normalizeDomain(b.companyDomain) || extractDomain(b.email ?? "");
  const workDomainSame = da && db && da === db && !isFreeMailDomain(da);

  if (na && nb && na === nb && workDomainSame) {
    reasons.push({
      code: "exact_name_and_domain",
      confidence: 0.9,
      detail: `Exact name "${na}" @ ${da}`,
    });
    confidence = Math.max(confidence, 0.9);
  } else if (na && nb && workDomainSame) {
    // 5. Fuzzy name + same work domain.
    const sim = nameSimilarity(na, nb);
    if (sim >= 0.85) {
      reasons.push({
        code: "fuzzy_name_and_domain",
        confidence: 0.75 + (sim - 0.85) * 1.0, // 0.75..0.9
        detail: `Fuzzy name ${na} ≈ ${nb} (${sim.toFixed(2)}) @ ${da}`,
      });
      confidence = Math.max(confidence, 0.75 + (sim - 0.85) * 1.0);
    } else {
      reasons.push({
        code: "same_company_different_person",
        confidence: 0.3,
        detail: `Same company ${da}, names differ (sim ${sim.toFixed(2)})`,
      });
      confidence = Math.max(confidence, 0.3);
    }
  }

  // Downweight if multiple signals strongly disagree
  // (e.g. same email but wildly different names).
  if (reasons.some((r) => r.code === "exact_email") && na && nb) {
    const sim = nameSimilarity(na, nb);
    if (sim < 0.4) {
      confidence = Math.min(confidence, 0.7);
      reasons.push({
        code: "same_company_different_person",
        confidence: 0.6,
        detail: `Email matches but names differ strongly — possible shared mailbox`,
      });
    }
  }

  const primaryId =
    (a.sourceWeight ?? 0) >= (b.sourceWeight ?? 0) ? a.id : b.id;
  const duplicateId = primaryId === a.id ? b.id : a.id;

  return {
    primaryId,
    duplicateId,
    confidence: Math.min(1, confidence),
    shouldMerge: confidence >= 0.85,
    reasons,
  };
}

/**
 * Run all-pairs match on a list of records and return the candidate merges
 * above the "likely duplicate" threshold.
 */
export function findDuplicates(
  records: PersonRecord[],
  threshold = 0.75,
): MergeCandidate[] {
  const out: MergeCandidate[] = [];
  for (let i = 0; i < records.length; i++) {
    for (let j = i + 1; j < records.length; j++) {
      const cand = compareRecords(records[i], records[j]);
      if (cand.confidence >= threshold) {
        out.push(cand);
      }
    }
  }
  // Highest confidence first.
  out.sort((a, b) => b.confidence - a.confidence);
  return out;
}

/**
 * Cluster records by union-find across merge candidates.
 */
export function clusterRecords(
  records: PersonRecord[],
  threshold = 0.85,
): Array<{ ids: string[]; confidence: number }> {
  const parent = new Map<string, string>();
  for (const r of records) parent.set(r.id, r.id);
  const find = (x: string): string => {
    let p = parent.get(x) ?? x;
    while (p !== parent.get(p)) {
      p = parent.get(p) ?? p;
      parent.set(x, p);
    }
    return p;
  };
  const union = (x: string, y: string) => {
    const rx = find(x), ry = find(y);
    if (rx !== ry) parent.set(rx, ry);
  };

  const edges = findDuplicates(records, threshold);
  const confByEdge = new Map<string, number>();
  for (const e of edges) {
    union(e.primaryId, e.duplicateId);
    confByEdge.set(`${e.primaryId}|${e.duplicateId}`, e.confidence);
  }

  const clusters = new Map<string, { ids: string[]; confidence: number }>();
  for (const r of records) {
    const root = find(r.id);
    if (!clusters.has(root)) clusters.set(root, { ids: [], confidence: 1.0 });
    clusters.get(root)!.ids.push(r.id);
  }
  // Attribute min edge confidence within each cluster.
  for (const e of edges) {
    const root = find(e.primaryId);
    const c = clusters.get(root);
    if (c) c.confidence = Math.min(c.confidence, e.confidence);
  }
  return Array.from(clusters.values()).filter((c) => c.ids.length > 1)
    .sort((a, b) => b.ids.length - a.ids.length);
}
