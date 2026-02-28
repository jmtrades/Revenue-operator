# Enterprise Control Plane

Minimal governance and audit primitives for templates, policies, and message sends. No admin console or dashboard; endpoints only.

## RBAC

- **Table**: `workspace_roles` — `(workspace_id, user_id, role)` with role in `owner | admin | operator | auditor | compliance`.
- **Access**: `requireWorkspaceAccess` allows a user if they are workspace owner or have any row in `workspace_roles` for that workspace.
- **Scoped access**: `requireWorkspaceRole(req, workspaceId, allowedRoles)` restricts to specific roles (e.g. only admin/operator for create, auditor/compliance for read-only).

## Audit log

- **Table**: `audit_log` — append-only. Fields: `workspace_id`, `actor_user_id`, `actor_type` (user | system), `action_type`, `details_json` (no PII), `recorded_at`.
- **Actions recorded**: `template_updated`, `policy_updated`, `template_approved`, `policy_approved`, `message_sent`, `message_blocked`.
- No deletes; queries by workspace and time, limit 200 newest first.

## Endpoints

- `GET /api/enterprise/templates?workspace_id=...` — list workspace + global templates (auth: owner/admin/operator/auditor/compliance).
- `POST /api/enterprise/templates` — create draft template (auth: owner/admin/operator).
- `POST /api/enterprise/templates/approve` — approve template by id (auth: owner/admin/compliance); records `template_approved` in audit.
- `GET /api/enterprise/policies?workspace_id=...` — list workspace + global policies.
- `POST /api/enterprise/policies` — create draft policy.
- `POST /api/enterprise/policies/approve` — approve policy by id; records `policy_approved` in audit.
- `GET /api/enterprise/audit?workspace_id=...` — last 200 audit entries (newest first).

All responses are structured JSON; no internal IDs in public-facing fields where doctrine requires. SSO can be added later by wiring auth to the same role checks.
