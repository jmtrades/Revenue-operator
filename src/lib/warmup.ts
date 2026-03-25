/**
 * Workspace warm-up limits by age.
 * Day 0-1: 20/day, Day 2-3: 50/day, Day 4-7: 150/day, Day 8+: unlimited
 */

export function getWarmupLimit(workspaceCreatedAt: Date): number {
  const now = new Date();
  const days = Math.floor((now.getTime() - workspaceCreatedAt.getTime()) / 86400000);
  if (days <= 1) return 20;
  if (days <= 3) return 50;
  if (days <= 7) return 150;
  return Number.POSITIVE_INFINITY;
}
