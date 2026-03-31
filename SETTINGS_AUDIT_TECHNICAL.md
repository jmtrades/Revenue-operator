# Revenue Operator Settings - Technical Audit Details

## Quick Reference: Missing Routes

### Missing Route 1: Update Member Role

**File Location:** Should be at `/src/app/api/workspace/members/role/route.ts`
**Current Status:** DOES NOT EXIST

**Used By:**
- `/src/app/app/settings/team/page.tsx` (line 60)
- Function: `handleRoleChange()`

**Implementation Details:**
```typescript
// Expected PATCH handler
export async function PATCH(req: NextRequest) {
  // 1. Parse request body: { workspace_id, email, role }
  // 2. Validate: role in ['admin', 'manager', 'viewer']
  // 3. Verify workspace access
  // 4. Update workspace_roles or workspace_members table
  // 5. Return success/error
}
```

**Related Working Route:**
- File: `/src/app/api/workspace/invite/route.ts` (POST)
- Shows similar pattern of workspace member operations

---

### Missing Route 2: Remove Member

**File Location:** Should be at `/src/app/api/workspace/members/remove/route.ts`
**Current Status:** DOES NOT EXIST

**Used By:**
- `/src/app/app/settings/team/page.tsx` (line 86)
- Function: `confirmRemoveMember()`

**Implementation Details:**
```typescript
// Expected POST handler
export async function POST(req: NextRequest) {
  // 1. Parse request body: { workspace_id, email }
  // 2. Verify workspace access
  // 3. Prevent removing last owner
  // 4. Delete from workspace_roles or workspace_members
  // 5. Return success/error
}
```

---

## Database Tables Involved

Based on code analysis, these tables are referenced:

```sql
-- Table: workspace_members
CREATE TABLE workspace_members (
  id uuid,
  workspace_id text,
  user_id uuid,
  role text,
  status text,
  created_at timestamp
);

-- Table: workspace_roles (alternative structure seen in code)
CREATE TABLE workspace_roles (
  id uuid,
  workspace_id text,
  user_id uuid,
  role text
);

-- Table: users
CREATE TABLE users (
  id uuid,
  email text,
  name text
);
```

**Referenced in:** `/src/app/api/workspace/invite/route.ts` (lines 42-47)

---

## Current Member Retrieval Logic

**File:** `/src/app/api/workspace/members/route.ts`

```typescript
// GET request joins users to get email/name
const { data: members } = await db
  .from("workspace_members")
  .select("id, user_id, role, status, created_at, users(email, name)")
  .eq("workspace_id", workspaceId)
  .order("created_at", { ascending: true });

// Maps to display format
const formatted = members.map((m) => ({
  name: users?.name || users?.email?.split("@")[0] || "Team member",
  email: users?.email || "",
  role: m.role || "member",
  status: m.status || "active",
}));
```

---

## Frontend Implementation Calling Missing Routes

### File: `/src/app/app/settings/team/page.tsx`

**Lines 57-77: handleRoleChange() function**
```typescript
const handleRoleChange = async (email: string, newRole: string) => {
  if (!workspaceId) return;
  try {
    const res = await fetch("/api/workspace/members/role", {  // ❌ BROKEN
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspace_id: workspaceId, email, role: newRole }),
    });
    if (res.ok) {
      setMembers((prev) => prev.map((m) => m.email === email ? { ...m, role: newRole } : m));
      setToast(t("team.roleUpdatedToast"));
    } else {
      const data = await res.json().catch(() => ({}));
      setToast((data as { error?: string }).error || t("team.roleUpdateFailed"));
    }
  } catch {
    setToast(t("team.networkError"));
  }
  setTimeout(() => setToast(null), 3000);
};
```

**Lines 83-103: confirmRemoveMember() function**
```typescript
const confirmRemoveMember = async (email: string) => {
  if (!workspaceId) return;
  try {
    const res = await fetch("/api/workspace/members/remove", {  // ❌ BROKEN
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspace_id: workspaceId, email }),
    });
    if (res.ok) {
      setMembers((prev) => prev.filter((m) => m.email !== email));
      setToast(t("team.memberRemovedToast"));
    } else {
      const data = await res.json().catch(() => ({}));
      setToast((data as { error?: string }).error || t("team.removeFailed"));
    }
  } catch {
    setToast(t("team.networkError"));
  }
  setTimeout(() => setToast(null), 3000);
};
```

---

## Similar Working Patterns to Reference

### Pattern 1: Update Operation (PATCH)
**File:** `/src/app/api/workspace/timezone/route.ts`

Structure for updating settings:
```typescript
export async function PATCH(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspaceId = session.workspaceId;
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 400 });

  const authErr = await requireWorkspaceAccess(req, workspaceId);
  if (authErr) return authErr;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = PATCH_BODY.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  const db = getDb();
  const { error } = await db
    .from("workspaces")
    .update({ timezone: parsed.data.timezone, updated_at: new Date().toISOString() })
    .eq("id", workspaceId)
    .eq("owner_id", session.userId);

  if (error) return NextResponse.json({ error: "Update failed" }, { status: 500 });
  return NextResponse.json({ timezone: parsed.data.timezone });
}
```

### Pattern 2: Insert Operation (POST)
**File:** `/src/app/api/workspace/invite/route.ts`

Structure for member operations:
```typescript
export async function POST(req: NextRequest) {
  let body: { workspace_id?: string; email?: string; role?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const workspaceId = body.workspace_id?.trim();
  if (!workspaceId) {
    return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  }

  const authErr = await requireWorkspaceAccess(req, workspaceId);
  if (authErr) return authErr;

  // ... validation and operations ...

  return NextResponse.json({ ok: true });
}
```

---

## What Happens When Routes Are Missing

### User Experience Impact

1. **Role Change Dropdown:**
   - User selects new role (admin/manager/viewer)
   - Toast appears: "Updating..."
   - After 3 seconds: Toast shows error "Could not update role" or "Network error"
   - Role reverts to previous value in UI
   - No backend update occurs
   - Network tab shows 404 error

2. **Remove Member Button:**
   - User clicks × button next to member
   - Confirmation dialog opens
   - User confirms deletion
   - Toast appears: "Removing..."
   - After 3 seconds: Toast shows error "Could not remove member" or "Network error"
   - Member still appears in list
   - No backend deletion occurs
   - Network tab shows 404 error

### Error Handling

From `team/page.tsx`:
```typescript
const data = await res.json().catch(() => ({}));
setToast((data as { error?: string }).error || t("team.roleUpdateFailed"));
```

Since the route doesn't exist (404), `res.ok` is false, triggering the error handler.

---

## Authorization Pattern Used

**File:** `/src/app/api/workspace/invite/route.ts` (line 21)

```typescript
const authErr = await requireWorkspaceAccess(req, workspaceId);
if (authErr) return authErr;
```

This should be used in both missing routes:
- Confirms user has workspace access
- Validates authentication
- Returns proper error if unauthorized

**Source:** `/src/lib/auth/workspace-access.ts`

---

## Role Validation Pattern

**File:** `/src/app/api/workspace/invite/route.ts` (line 29)

```typescript
const role = ["admin", "manager", "viewer"].includes(body.role ?? "")
  ? body.role!
  : "viewer";
```

This pattern should be used in the role update route:
- Only allow valid roles
- Default to "viewer" if invalid
- Prevents privilege escalation

---

## Zod Schema Examples

**File:** `/src/app/api/workspace/timezone/route.ts` (line 12)

```typescript
const PATCH_BODY = z.object({ timezone: z.string().min(1).max(64) });
```

For the missing routes, schemas should be:

```typescript
// For role update
const PATCH_BODY = z.object({
  workspace_id: z.string().min(1),
  email: z.string().email(),
  role: z.enum(["admin", "manager", "viewer"]),
});

// For member removal
const POST_BODY = z.object({
  workspace_id: z.string().min(1),
  email: z.string().email(),
});
```

---

## Security Considerations

1. **Prevent Owner Removal:** Don't allow removing the workspace owner
2. **Prevent Self-Demotion:** Warn if user tries to remove their own admin role
3. **Audit Log:** Log all role changes and member removals
4. **Rate Limiting:** Limit rapid role/member changes (use `checkRateLimit` if available)
5. **Seat Limits:** Respect billing plan seat limits (see `invite/route.ts` lines 53-77)

---

## Testing Checklist

- [ ] Update member role - success case
- [ ] Update member role - invalid role
- [ ] Update member role - non-existent email
- [ ] Update member role - unauthorized user
- [ ] Remove member - success case
- [ ] Remove member - prevent owner removal
- [ ] Remove member - non-existent email
- [ ] Remove member - unauthorized user
- [ ] Rate limiting on role changes
- [ ] Rate limiting on member removal
- [ ] Audit logs capture changes

---

## Related Files to Review

1. `/src/app/api/workspace/members/route.ts` - GET implementation
2. `/src/app/api/workspace/invite/route.ts` - Similar POST pattern
3. `/src/app/api/workspace/timezone/route.ts` - Similar PATCH pattern
4. `/src/app/app/settings/team/page.tsx` - Frontend calling code
5. `/src/lib/auth/workspace-access.ts` - Auth helper
6. `/src/lib/auth/request-session.ts` - Session helper
7. `/src/lib/db/queries.ts` - Database initialization

---

## Notes

- Both missing routes follow standard Next.js App Router patterns
- Both should use `export const dynamic = "force-dynamic"` (like other workspace routes)
- Both should include proper error logging to console
- Both should handle Supabase query errors gracefully
- Request/response format should match the frontend expectations in `team/page.tsx`
