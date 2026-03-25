# Prune Report — Safe Prune Apply (PRODUCTION LOCKED)

**Date:** Run after safe prune / launch lock task.  
**Status:** No files deleted. All candidates retained.

---

## Summary

- **Dry-run executed:** `npx tsx scripts/prune-unused.ts`
- **Candidate list:** The script reported a large set of “unreachable” candidates (components, lib modules).
- **Decision:** **No files were deleted.** The candidate list was reviewed and found to contain false positives: core pipeline and intelligence modules (e.g. `execution-plan/build.ts`, `execution-plan/emit.ts`, `execution-plan/run.ts`, `domain-packs/*`, `intelligence/*`, `scenarios/*`, `speech-governance/*`) are directly or transitively imported by app routes and/or tests but still appeared as candidates. Deleting any of these would break the build or tests.
- **Prune script updates:** The script was updated to (1) resolve barrel (`index.ts`) imports, and (2) treat `__tests__` and `src/instrumentation.ts` as entry points. Even with these fixes, the unreachable set still included clearly used modules, so the current reachability logic is not trusted for safe deletion.

---

## Deleted files

| File | Reason |
|------|--------|
| *(none)* | No deletions applied. |

**Total files deleted:** 0

---

## Retained files (candidates from dry-run)

All candidates from the dry-run are **retained**. Reasons:

- **Referenced by app routes or Next route discovery:** e.g. `src/lib/execution-plan/*`, `src/lib/domain-packs/*`, `src/lib/intelligence/*`, `src/lib/scenarios/*`, `src/lib/speech-governance/*` are imported by API routes (ingest, voice outcome, action-intents/complete, activate/execution, internal/scenarios/incident, etc.).
- **Referenced by tests:** Many `src/lib/*` modules are imported by `__tests__` (invariant tests, contract tests). The prune script adds tests as entry points, but transitive resolution still left core modules in the candidate list (possible path/alias resolution differences).
- **Referenced indirectly / barrel exports:** Some modules are reached only via barrel (`index.ts`) or re-exports; the script’s barrel resolution is not complete in all cases.
- **Next / instrumentation:** `src/app/global-error.tsx`, `src/instrumentation.ts` are special Next/runtime entry points and must be retained.

Therefore, **every file that appeared in the dry-run candidate list is treated as “retain”** to avoid any risk of breaking the pipeline, tests, or build.

---

## Verification commands (after prune decision)

All three commands were run and passed **without** applying any deletions:

| Command | Result |
|---------|--------|
| `npm test` | Pass (all tests green) |
| `npm run prebuild` | Pass (verify-guarantees) |
| `npm run build` | Pass (Next.js build success) |

No revert was required because no batch was applied.

---

## Protected paths (never considered for deletion)

- `supabase/migrations/**`
- `docs/SYSTEM_SPEC.md`
- `docs/FINAL_LOCK_CHECKLIST.md`
- `docs/LAUNCH_QUALITY_REPORT.md`
- `WHAT_CHANGED.md`

These paths are excluded by the prune script and were not in the candidate list.
