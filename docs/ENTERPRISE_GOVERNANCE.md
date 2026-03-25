# Enterprise Governance

Approval modes, roles, and jurisdiction lock. No permissive fallback when governance is required.

## Approval modes

Resolved per workspace/domain/jurisdiction/channel via message policy:

- **autopilot** — Send when template and compliance pass.
- **preview_required** — Return preview payload; do not send. User or system can then approve.
- **approval_required** — Create approval row; return `decision: "approval_required"`. Never send until approval step completes.
- **jurisdiction_locked** — Execution blocked until jurisdiction-specific compliance pack is complete and approved. No fallback to autopilot.

When `approval_required` or `jurisdiction_locked` is set, the compiler never returns `decision: "send"` for that path.

## Roles

- **workspace_roles**: owner | admin | operator | auditor | compliance.
- **Dual approval**: Team/Enterprise can require two approvers (e.g. operator + compliance) before send. Enforced by feature gate and policy.

## Jurisdiction lock

- If compliance pack for the workspace jurisdiction is missing required fields (disclaimers, consent rules, quiet hours where required), the compiler returns block with reason.
- No permissive behavior: jurisdiction_locked mode does not fall back to autopilot.

## Audit

- `GET /api/enterprise/audit?workspace_id=...` — deterministic ordering (newest first), append-only. No deletes.
- Audit export for regulators: same ordering; no internal IDs in exported payload where doctrine requires.

## Compliance officer override

Enterprise can configure compliance officer role to override blocked sends only when policy allows (e.g. after disclosure added). Implemented via approval flow, not bypass.

See `src/lib/governance/message-policy.ts`, `src/lib/speech-governance/compiler.ts`, and `docs/ENTERPRISE_CONTROL_PLANE.md`.
