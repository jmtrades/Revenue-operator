// Canonical post-auth onboarding lives at /app/onboarding (Phase 69).
// This route 301-redirects so old bookmarks and in-app links keep working
// while we retire the duplicate wizard that used to live here.
//
// The previous 681-line duplicate wizard is intentionally removed — it
// diverged from /app/onboarding (different voice catalog, different step
// model, no starter-knowledge integration) and was never the canonical
// path. See ADR Phase-69.

import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function DashboardOnboardingRedirect({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const v of value) qs.append(key, v);
    } else {
      qs.set(key, value);
    }
  }
  const query = qs.toString();
  redirect(`/app/onboarding${query ? `?${query}` : ""}`);
}
