# Guarantee Contract

This system is **operational infrastructure**.

Any change that weakens:

- **ordering**
- **escalation visibility**
- **delivery confirmation**
- **reconciliation coverage**
- **closure correctness**
- **auditability**

is **invalid** even if the feature works.

**Correctness > features.**

---

## Enforcement

- Guarantee contract tests: `__tests__/guarantee-contract.test.ts`
- Pre-build verification: `npm run prebuild` runs these tests; build fails if they fail.
- Unsafe write guard: writes to `leads`, `canonical_signals`, `escalation_logs`, `action_commands` are only allowed from signal consumer, closure, reconciliation, delivery, and integrity paths.
- Runtime assertions: `assertSystemGuarantees` runs with the integrity audit and throws `ProgressStalledError` when guarantees are violated.

Do not remove or weaken these defenses.
