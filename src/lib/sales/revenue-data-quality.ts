/**
 * Phase 55 — Revenue data quality monitor.
 *
 * Scans CRM data (deals, accounts, contacts, activities) for defects that
 * erode forecast accuracy: missing next-step, stale amounts, skipped stages,
 * orphaned opportunities, overdue close dates, duplicate accounts, etc.
 *
 * Produces:
 *   - Issue list with severity, category, and remediation guidance.
 *   - DQ score (0..100) composed of per-category weighted pass rates.
 *   - Per-owner fix-list so RevOps can route work.
 *
 * Pure. No I/O. Caller supplies snapshots.
 */

// ---------- Inputs ----------

export type DealStage =
  | "prospecting"
  | "qualification"
  | "discovery"
  | "evaluation"
  | "proposal"
  | "negotiation"
  | "closed_won"
  | "closed_lost";

/** Canonical stage ordering for skip detection. */
const STAGE_ORDER: DealStage[] = [
  "prospecting",
  "qualification",
  "discovery",
  "evaluation",
  "proposal",
  "negotiation",
  "closed_won",
];

export interface DealSnapshot {
  dealId: string;
  accountId: string;
  ownerId: string;
  stage: DealStage;
  amount?: number;
  currency?: string;
  closeDateIso?: string;
  createdAtIso: string;
  lastModifiedIso: string;
  /** Owner-written next step. */
  nextStep?: string;
  /** ISO of next step. */
  nextStepDueIso?: string;
  /** Stage history for skip detection. */
  stageHistory?: { stage: DealStage; enteredIso: string }[];
  /** Last activity timestamp (call / email / meeting) on the deal. */
  lastActivityIso?: string;
}

export interface AccountSnapshot {
  accountId: string;
  name: string;
  ownerId?: string;
  domain?: string;
  createdAtIso: string;
  /** Whether at least one primary contact exists. */
  hasPrimaryContact: boolean;
  /** Whether a parent/global account has been linked. */
  parentAccountId?: string;
}

export interface ContactSnapshot {
  contactId: string;
  accountId: string;
  email?: string;
  phone?: string;
  title?: string;
  unsubscribed?: boolean;
}

export interface DataQualityRequest {
  asOfIso: string;
  deals: DealSnapshot[];
  accounts: AccountSnapshot[];
  contacts: ContactSnapshot[];
  /** Freshness threshold in days — stale records past this trigger findings. */
  stalenessDays?: number;
  /** Look-back for activity requirement, default 14 days. */
  activityLookbackDays?: number;
}

// ---------- Outputs ----------

export type IssueCategory =
  | "missing_next_step"
  | "stale_amount"
  | "missing_amount"
  | "overdue_close_date"
  | "stage_skip"
  | "orphaned_deal"
  | "inactive_deal"
  | "duplicate_account"
  | "duplicate_contact"
  | "missing_contact"
  | "missing_domain"
  | "missing_owner"
  | "unreachable_contact"
  | "currency_inconsistency";

export type IssueSeverity = "info" | "warning" | "critical";

export interface DataQualityIssue {
  id: string;
  category: IssueCategory;
  severity: IssueSeverity;
  entityType: "deal" | "account" | "contact";
  entityId: string;
  ownerId?: string;
  headline: string;
  remediation: string;
  detectedAtIso: string;
}

export interface CategoryScore {
  category: IssueCategory;
  passRate: number; // 0..1
  weight: number;
  contribution: number; // weight * passRate
  failedCount: number;
  totalEvaluated: number;
}

export interface OwnerFixList {
  ownerId: string;
  issueCount: number;
  criticalCount: number;
  topCategories: IssueCategory[];
  issues: DataQualityIssue[];
}

export interface DataQualityReport {
  asOfIso: string;
  overallScore: number; // 0..100
  grade: "A" | "B" | "C" | "D" | "F";
  issues: DataQualityIssue[];
  categoryScores: CategoryScore[];
  ownerFixLists: OwnerFixList[];
  headline: string;
  callouts: string[];
}

// ---------- Helpers ----------

function daysBetween(a: string, b: string): number {
  const t1 = new Date(a).getTime();
  const t2 = new Date(b).getTime();
  if (!Number.isFinite(t1) || !Number.isFinite(t2)) return 0;
  return Math.abs(t2 - t1) / 86_400_000;
}

function after(a: string, b: string): boolean {
  const t1 = new Date(a).getTime();
  const t2 = new Date(b).getTime();
  if (!Number.isFinite(t1) || !Number.isFinite(t2)) return false;
  return t1 > t2;
}

function stageIndex(s: DealStage): number {
  const idx = STAGE_ORDER.indexOf(s);
  return idx === -1 ? STAGE_ORDER.length - 1 : idx;
}

function normalizeDomain(domain?: string): string | null {
  if (!domain) return null;
  const cleaned = domain.trim().toLowerCase().replace(/^www\./, "");
  return cleaned || null;
}

function normalizeEmail(email?: string): string | null {
  if (!email) return null;
  const cleaned = email.trim().toLowerCase();
  return cleaned || null;
}

// ---------- Detectors ----------

function detectDealIssues(
  deals: DealSnapshot[],
  accounts: AccountSnapshot[],
  opts: { asOfIso: string; stalenessDays: number; activityLookbackDays: number },
): DataQualityIssue[] {
  const accountById = new Map(accounts.map((a) => [a.accountId, a]));
  const issues: DataQualityIssue[] = [];

  for (const d of deals) {
    if (d.stage === "closed_won" || d.stage === "closed_lost") continue;

    if (!d.nextStep || d.nextStep.trim().length === 0) {
      issues.push({
        id: `deal:${d.dealId}:missing_next_step`,
        category: "missing_next_step",
        severity: d.stage === "negotiation" || d.stage === "proposal" ? "critical" : "warning",
        entityType: "deal",
        entityId: d.dealId,
        ownerId: d.ownerId,
        headline: `${d.stage} stage deal ${d.dealId} has no documented next step.`,
        remediation: "Owner must log next step with date and stakeholder.",
        detectedAtIso: opts.asOfIso,
      });
    }

    if (d.amount === undefined || d.amount <= 0) {
      issues.push({
        id: `deal:${d.dealId}:missing_amount`,
        category: "missing_amount",
        severity: "warning",
        entityType: "deal",
        entityId: d.dealId,
        ownerId: d.ownerId,
        headline: `Deal ${d.dealId} has no amount recorded.`,
        remediation: "Request quote / estimate before moving to proposal stage.",
        detectedAtIso: opts.asOfIso,
      });
    } else if (daysBetween(d.lastModifiedIso, opts.asOfIso) > opts.stalenessDays) {
      issues.push({
        id: `deal:${d.dealId}:stale_amount`,
        category: "stale_amount",
        severity: "warning",
        entityType: "deal",
        entityId: d.dealId,
        ownerId: d.ownerId,
        headline: `Deal ${d.dealId} amount unchanged for > ${opts.stalenessDays} days.`,
        remediation: "Re-confirm deal value with economic buyer.",
        detectedAtIso: opts.asOfIso,
      });
    }

    if (d.closeDateIso && after(opts.asOfIso, d.closeDateIso)) {
      issues.push({
        id: `deal:${d.dealId}:overdue_close_date`,
        category: "overdue_close_date",
        severity: "critical",
        entityType: "deal",
        entityId: d.dealId,
        ownerId: d.ownerId,
        headline: `Deal ${d.dealId} close date is in the past but still open.`,
        remediation: "Update close date or close-lose the opportunity.",
        detectedAtIso: opts.asOfIso,
      });
    }

    // Stage skip detection
    if (d.stageHistory && d.stageHistory.length >= 2) {
      for (let i = 1; i < d.stageHistory.length; i++) {
        const prev = d.stageHistory[i - 1].stage;
        const curr = d.stageHistory[i].stage;
        if (stageIndex(curr) - stageIndex(prev) >= 2 && curr !== "closed_lost") {
          issues.push({
            id: `deal:${d.dealId}:stage_skip`,
            category: "stage_skip",
            severity: "warning",
            entityType: "deal",
            entityId: d.dealId,
            ownerId: d.ownerId,
            headline: `Deal ${d.dealId} skipped from ${prev} → ${curr}.`,
            remediation: "Confirm qualification met for the skipped stage(s).",
            detectedAtIso: opts.asOfIso,
          });
          break;
        }
      }
    }

    // Orphaned deal: account missing or missing primary contact
    const account = accountById.get(d.accountId);
    if (!account) {
      issues.push({
        id: `deal:${d.dealId}:orphaned_deal`,
        category: "orphaned_deal",
        severity: "critical",
        entityType: "deal",
        entityId: d.dealId,
        ownerId: d.ownerId,
        headline: `Deal ${d.dealId} references unknown account ${d.accountId}.`,
        remediation: "Link deal to an existing account or create the account record.",
        detectedAtIso: opts.asOfIso,
      });
    } else if (!account.hasPrimaryContact) {
      issues.push({
        id: `deal:${d.dealId}:missing_contact`,
        category: "missing_contact",
        severity: "warning",
        entityType: "deal",
        entityId: d.dealId,
        ownerId: d.ownerId,
        headline: `Deal ${d.dealId} has no primary contact on account ${d.accountId}.`,
        remediation: "Add a primary contact with valid email or phone.",
        detectedAtIso: opts.asOfIso,
      });
    }

    // Inactivity detection
    const lastActivity = d.lastActivityIso ?? d.lastModifiedIso;
    if (daysBetween(lastActivity, opts.asOfIso) > opts.activityLookbackDays) {
      issues.push({
        id: `deal:${d.dealId}:inactive_deal`,
        category: "inactive_deal",
        severity: "warning",
        entityType: "deal",
        entityId: d.dealId,
        ownerId: d.ownerId,
        headline: `Deal ${d.dealId} has no activity in > ${opts.activityLookbackDays} days.`,
        remediation: "Book follow-up or close-lose if deal is truly dead.",
        detectedAtIso: opts.asOfIso,
      });
    }
  }

  return issues;
}

function detectAccountIssues(accounts: AccountSnapshot[], asOfIso: string): DataQualityIssue[] {
  const issues: DataQualityIssue[] = [];
  const byDomain = new Map<string, AccountSnapshot[]>();
  const byName = new Map<string, AccountSnapshot[]>();

  for (const a of accounts) {
    const d = normalizeDomain(a.domain);
    if (d) {
      if (!byDomain.has(d)) byDomain.set(d, []);
      byDomain.get(d)!.push(a);
    } else {
      issues.push({
        id: `account:${a.accountId}:missing_domain`,
        category: "missing_domain",
        severity: "info",
        entityType: "account",
        entityId: a.accountId,
        ownerId: a.ownerId,
        headline: `Account ${a.name} has no domain.`,
        remediation: "Request domain from AE — blocks dedup and enrichment.",
        detectedAtIso: asOfIso,
      });
    }
    const key = a.name.trim().toLowerCase();
    if (!byName.has(key)) byName.set(key, []);
    byName.get(key)!.push(a);

    if (!a.ownerId) {
      issues.push({
        id: `account:${a.accountId}:missing_owner`,
        category: "missing_owner",
        severity: "warning",
        entityType: "account",
        entityId: a.accountId,
        headline: `Account ${a.name} has no owner.`,
        remediation: "Assign owner via round-robin or territory rule.",
        detectedAtIso: asOfIso,
      });
    }
  }

  for (const [domain, rows] of byDomain) {
    if (rows.length >= 2) {
      for (const r of rows) {
        issues.push({
          id: `account:${r.accountId}:duplicate_account:${domain}`,
          category: "duplicate_account",
          severity: "warning",
          entityType: "account",
          entityId: r.accountId,
          ownerId: r.ownerId,
          headline: `Account ${r.name} shares domain ${domain} with ${rows.length - 1} other(s).`,
          remediation: "Merge or link to parent account.",
          detectedAtIso: asOfIso,
        });
      }
    }
  }
  for (const [name, rows] of byName) {
    if (rows.length >= 2) {
      // Distinct domains or missing domain + shared name
      for (const r of rows) {
        issues.push({
          id: `account:${r.accountId}:duplicate_account:name:${name}`,
          category: "duplicate_account",
          severity: "info",
          entityType: "account",
          entityId: r.accountId,
          ownerId: r.ownerId,
          headline: `Account name collides with ${rows.length - 1} other record(s).`,
          remediation: "Verify whether records represent the same legal entity.",
          detectedAtIso: asOfIso,
        });
      }
    }
  }
  return issues;
}

function detectContactIssues(contacts: ContactSnapshot[], asOfIso: string): DataQualityIssue[] {
  const issues: DataQualityIssue[] = [];
  const emailMap = new Map<string, ContactSnapshot[]>();
  for (const c of contacts) {
    const email = normalizeEmail(c.email);
    const phone = c.phone?.replace(/\D+/g, "") ?? "";
    if (!email && !phone) {
      issues.push({
        id: `contact:${c.contactId}:unreachable_contact`,
        category: "unreachable_contact",
        severity: "warning",
        entityType: "contact",
        entityId: c.contactId,
        headline: `Contact ${c.contactId} has no email or phone.`,
        remediation: "Enrich or remove to prevent stale outreach attempts.",
        detectedAtIso: asOfIso,
      });
    }
    if (email) {
      if (!emailMap.has(email)) emailMap.set(email, []);
      emailMap.get(email)!.push(c);
    }
  }
  for (const [email, rows] of emailMap) {
    if (rows.length >= 2) {
      for (const r of rows) {
        issues.push({
          id: `contact:${r.contactId}:duplicate_contact:${email}`,
          category: "duplicate_contact",
          severity: "info",
          entityType: "contact",
          entityId: r.contactId,
          headline: `Contact email ${email} appears ${rows.length}×.`,
          remediation: "Merge contacts or enforce unique-email constraint.",
          detectedAtIso: asOfIso,
        });
      }
    }
  }
  return issues;
}

function detectCurrencyInconsistency(deals: DealSnapshot[], asOfIso: string): DataQualityIssue[] {
  const perAccount = new Map<string, Set<string>>();
  for (const d of deals) {
    if (!d.currency) continue;
    if (!perAccount.has(d.accountId)) perAccount.set(d.accountId, new Set());
    perAccount.get(d.accountId)!.add(d.currency);
  }
  const issues: DataQualityIssue[] = [];
  for (const [accountId, currencies] of perAccount) {
    if (currencies.size >= 2) {
      issues.push({
        id: `account:${accountId}:currency_inconsistency`,
        category: "currency_inconsistency",
        severity: "info",
        entityType: "account",
        entityId: accountId,
        headline: `Account ${accountId} has deals in ${currencies.size} currencies: ${[...currencies].join(", ")}.`,
        remediation: "Pick a canonical billing currency for the account.",
        detectedAtIso: asOfIso,
      });
    }
  }
  return issues;
}

// ---------- Scoring ----------

const CATEGORY_WEIGHTS: Record<IssueCategory, number> = {
  missing_next_step: 2.5,
  stale_amount: 1.5,
  missing_amount: 2,
  overdue_close_date: 2.5,
  stage_skip: 1,
  orphaned_deal: 3,
  inactive_deal: 1.5,
  duplicate_account: 1,
  duplicate_contact: 0.5,
  missing_contact: 1.5,
  missing_domain: 0.5,
  missing_owner: 1,
  unreachable_contact: 1,
  currency_inconsistency: 0.5,
};

function gradeFor(score: number): "A" | "B" | "C" | "D" | "F" {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

function scoreCategories(
  req: DataQualityRequest,
  issues: DataQualityIssue[],
): { categoryScores: CategoryScore[]; overallScore: number } {
  const openDeals = req.deals.filter(
    (d) => d.stage !== "closed_won" && d.stage !== "closed_lost",
  ).length;
  const totals: Record<IssueCategory, number> = {
    missing_next_step: openDeals,
    stale_amount: openDeals,
    missing_amount: openDeals,
    overdue_close_date: openDeals,
    stage_skip: openDeals,
    orphaned_deal: openDeals,
    inactive_deal: openDeals,
    duplicate_account: req.accounts.length,
    duplicate_contact: req.contacts.length,
    missing_contact: openDeals,
    missing_domain: req.accounts.length,
    missing_owner: req.accounts.length,
    unreachable_contact: req.contacts.length,
    currency_inconsistency: req.accounts.length,
  };
  const failed: Record<IssueCategory, Set<string>> = Object.keys(CATEGORY_WEIGHTS).reduce(
    (acc, key) => {
      acc[key as IssueCategory] = new Set();
      return acc;
    },
    {} as Record<IssueCategory, Set<string>>,
  );
  for (const issue of issues) {
    failed[issue.category].add(issue.entityId);
  }
  const categoryScores: CategoryScore[] = Object.keys(CATEGORY_WEIGHTS).map((key) => {
    const category = key as IssueCategory;
    const total = Math.max(1, totals[category]);
    const failedCount = failed[category].size;
    const passRate = Math.max(0, 1 - failedCount / total);
    const weight = CATEGORY_WEIGHTS[category];
    return {
      category,
      passRate,
      weight,
      contribution: passRate * weight,
      failedCount,
      totalEvaluated: total,
    };
  });
  const totalWeight = categoryScores.reduce((s, c) => s + c.weight, 0);
  const weightedPass = categoryScores.reduce((s, c) => s + c.contribution, 0);
  const overallScore = totalWeight === 0 ? 100 : Math.round((weightedPass / totalWeight) * 100);
  return { categoryScores, overallScore };
}

function buildOwnerFixLists(issues: DataQualityIssue[]): OwnerFixList[] {
  const byOwner = new Map<string, DataQualityIssue[]>();
  for (const issue of issues) {
    const key = issue.ownerId ?? "unassigned";
    if (!byOwner.has(key)) byOwner.set(key, []);
    byOwner.get(key)!.push(issue);
  }
  return Array.from(byOwner.entries()).map(([ownerId, list]) => {
    const critical = list.filter((i) => i.severity === "critical").length;
    const catCount = new Map<IssueCategory, number>();
    for (const i of list) catCount.set(i.category, (catCount.get(i.category) ?? 0) + 1);
    const topCategories = Array.from(catCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([c]) => c);
    return {
      ownerId,
      issueCount: list.length,
      criticalCount: critical,
      topCategories,
      issues: list,
    };
  }).sort((a, b) => b.criticalCount - a.criticalCount || b.issueCount - a.issueCount);
}

function headlineFor(score: number, grade: string, issues: DataQualityIssue[]): string {
  return `Data quality ${score}/100 (${grade}) · ${issues.length} issue(s) across ${new Set(issues.map((i) => i.entityId)).size} record(s).`;
}

function calloutsFor(issues: DataQualityIssue[]): string[] {
  const out: string[] = [];
  const critical = issues.filter((i) => i.severity === "critical").length;
  if (critical > 0) {
    out.push(`${critical} critical issue(s) block forecast accuracy — triage today.`);
  }
  const missingNextStep = issues.filter((i) => i.category === "missing_next_step").length;
  if (missingNextStep >= 5) {
    out.push(`${missingNextStep} deals missing next step — likely pipeline inflation risk.`);
  }
  const overdueClose = issues.filter((i) => i.category === "overdue_close_date").length;
  if (overdueClose > 0) {
    out.push(`${overdueClose} deals have overdue close dates — sync forecast before review.`);
  }
  return out;
}

// ---------- Public API ----------

export function scanRevenueDataQuality(req: DataQualityRequest): DataQualityReport {
  const stalenessDays = req.stalenessDays ?? 21;
  const activityLookbackDays = req.activityLookbackDays ?? 14;

  const dealIssues = detectDealIssues(req.deals, req.accounts, {
    asOfIso: req.asOfIso,
    stalenessDays,
    activityLookbackDays,
  });
  const accountIssues = detectAccountIssues(req.accounts, req.asOfIso);
  const contactIssues = detectContactIssues(req.contacts, req.asOfIso);
  const currencyIssues = detectCurrencyInconsistency(req.deals, req.asOfIso);

  const issues = [...dealIssues, ...accountIssues, ...contactIssues, ...currencyIssues];
  const { categoryScores, overallScore } = scoreCategories(req, issues);
  const grade = gradeFor(overallScore);
  const ownerFixLists = buildOwnerFixLists(issues);
  return {
    asOfIso: req.asOfIso,
    overallScore,
    grade,
    issues,
    categoryScores,
    ownerFixLists,
    headline: headlineFor(overallScore, grade, issues),
    callouts: calloutsFor(issues),
  };
}
