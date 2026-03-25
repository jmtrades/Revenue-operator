# Domain Packs

Structured industry presets. Strategy graph, objection tree, regulatory matrix. No LLM output; config only.

## Structure

Each pack defines:

- **strategy_graph** — `initial_state` + `states` (≥15 states for full coverage). Each state: `allowed_intents`, `emotional_posture`, `transition_rules`, `required_disclosures`, `exit_conditions`.
- **objection_tree_library** — Named trees (e.g. `default`). Each node: `objection_phrase`, `soft_redirect_path`, `escalation_threshold`, `children`.
- **regulatory_matrix** — `required_disclaimers`, `state_based_quiet_hours`, `recording_consent_required`, `opt_out_enforcement`, industry-specific (e.g. `fair_housing_language`, `insurance_disclosures`).

## Required fields

- Every pack must have `strategy_graph.states` with at least 15 states (enforced by `domain_pack_depth_enforcement.test.ts`).
- Every pack must have `objection_tree_library` with at least one tree.
- Every pack must have `regulatory_matrix` with `required_disclaimers` (array, may be empty).

## Adding a new industry safely

1. Add a new constant (e.g. `NEW_INDUSTRY_PACK`) in `src/lib/domain-packs/presets/industry-packs.ts`.
2. Use `BASE_STRATEGY_STATES` or extend with extra states so total ≥15.
3. Add objection tree (use `COMMON_OBJECTION_TREE` or define nodes with `objection_phrase`, `escalation_threshold`).
4. Add `regulatory_matrix` with required disclaimers and consent/quiet-hour rules for that vertical.
5. Register in `INDUSTRY_PACKS` and in `getIndustryPackPreset` if needed.
6. Run `npm test -- __tests__/domain_pack_depth_enforcement.test.ts __tests__/domain_pack_objection_integrity.test.ts __tests__/domain_pack_regulatory_required_fields.test.ts`.

No AI improvisation; all behavior is deterministic from pack config. See `docs/DOMAIN_PACKS_COMPLIANCE.md` for resolver and policy wiring.
