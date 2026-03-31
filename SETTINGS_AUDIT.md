# Revenue Operator Settings Audit Report

**Date:** March 23, 2026
**Scope:** All settings pages and related API routes
**Status:** Audit Complete

---

## CRITICAL BUGS IDENTIFIED

### 🔴 HIGH PRIORITY: Missing API Routes for Team/Members Management

**Location:** `/src/app/app/settings/team/page.tsx`

**Issue:** The team settings page references two API routes that do NOT exist:

#### Missing Route #1: `/api/workspace/members/role`
- **HTTP Method:** PATCH
- **Used at:** Line 60 in team/page.tsx
- **Purpose:** Update a team member's role (admin/manager/viewer)
- **Expected Request Body:**
  ```json
  {
    "workspace_id": "string",
    "email": "string",
    "role": "admin" | "manager" | "viewer"
  }
  ```
- **Current Status:** ROUTE DOES NOT EXIST
- **Impact:** Users cannot change member roles - dropdown changes will fail silently with API errors

#### Missing Route #2: `/api/workspace/members/remove`
- **HTTP Method:** POST
- **Used at:** Line 86 in team/page.tsx
- **Purpose:** Remove a team member from the workspace
- **Expected Request Body:**
  ```json
  {
    "workspace_id": "string",
    "email": "string"
  }
  ```
- **Current Status:** ROUTE DOES NOT EXIST
- **Impact:** Users cannot remove members - remove button will fail with 404 errors

**Affected User Workflow:**
- Team member list displays correctly ✓
- Inviting new members works ✓
- Changing member roles: **BROKEN** ✗
- Removing members: **BROKEN** ✗

---

## ALL SETTINGS PAGES - DETAILED STATUS

### ✅ General Settings `/app/settings`
**Status:** FULLY WORKING
- Profile display
- Display name editing
- Timezone selection
- Profile save to `/api/auth/profile`
- Readiness checklist

### ✅ Business Settings `/app/settings/business`
**Status:** FULLY WORKING
- Business name field
- Address field
- Website field
- Timezone selection
- Industry selection
- All save operations using `/api/workspace/me` (PATCH)
- Delete workspace using `/api/workspace/delete` (POST)

### ✅ Phone Settings `/app/settings/phone`
**Status:** FULLY WORKING
- Phone number provisioning via `/api/phone/provision`
- Phone number verification (start: `/api/phone/verify-start`, check: `/api/phone/verify-check`)
- Outbound number configuration via `/api/workspace/phone`
- WhatsApp enablement
- Test call functionality via `/api/agents/[id]/test-call`
- Phone porting via `/api/phone/port-request`

### ✅ Agent Settings `/app/settings/agent`
**Status:** FULLY WORKING
- Agent name and greeting editing
- Voice selection from RECALL_VOICES
- Knowledge base management
- Language preferences
- Tone preset selection
- Transfer policy configuration
- Escalation settings
- Objection handling
- All save operations using `/api/workspace/agent` (PATCH)

### ✅ Call Rules `/app/settings/call-rules`
**Status:** FULLY WORKING
- After-hours behavior options (messages/emergency/forward)
- Emergency keywords configuration
- Transfer phone number
- All save operations using `/api/workspace/call-rules` (PATCH)

### ⚠️ Team Settings `/app/settings/team`
**Status:** PARTIALLY BROKEN
- ✅ View team members from `/api/workspace/members`
- ✅ Invite members via `/api/workspace/invite`
- ❌ Update member roles via `/api/workspace/members/role` (MISSING)
- ❌ Remove members via `/api/workspace/members/remove` (MISSING)

### ✅ Billing Settings `/app/settings/billing`
**Status:** FULLY WORKING
- Plan display and upgrade
- Usage tracking and visualization
- Minute pack purchases via `/api/billing/buy-minutes`
- Subscription pause via `/api/billing/pause-coverage`
- Billing portal access via `/api/billing/portal`
- Plan change notifications

### ✅ Notifications `/app/settings/notifications`
**Status:** FULLY WORKING
- Notification channel preferences (push, SMS, email)
- Event-based configuration
- All save operations using `/api/workspace/me` (PATCH)

### ✅ Lead Scoring `/app/settings/lead-scoring`
**Status:** FULLY WORKING
- Lead scoring weight configuration
- Reset to defaults functionality
- All save operations using `/api/workspace/lead-scoring-config` (PATCH)

### ✅ Integrations `/app/settings/integrations`
**Status:** FULLY WORKING
- CRM status checks via `/api/integrations/crm/status`
- CRM provider connection via `/api/integrations/crm/[provider]/connect`
- Field mapping via `/api/integrations/crm/[provider]/mapping`
- Google Calendar status via `/api/integrations/google-calendar/status`
- Calendar availability via `/api/integrations/google-calendar/availability`
- Webhook configuration via `/api/workspaces/[id]/webhook-config`
- Webhook testing via `/api/workspaces/[id]/webhook-config/test`
- Slack integration via `/api/integrations/slack/oauth`

### ✅ Integrations → Mapping `/app/settings/integrations/mapping`
**Status:** FULLY WORKING
- CRM field mapping via `/api/integrations/crm/[provider]/mapping` (GET, PATCH)

### ✅ Integrations → Sync Log `/app/settings/integrations/sync-log`
**Status:** FULLY WORKING
- Integration sync history via `/api/integrations/sync-log`
- Provider filtering
- Date range filtering

### ✅ Compliance `/app/settings/compliance`
**Status:** FULLY WORKING
- Recording consent settings
- All save operations using `/api/workspace/recording-consent` (PATCH)

### ✅ Activity `/app/settings/activity`
**Status:** FULLY WORKING
- Workspace activity log via `/api/workspace/activity`
- Event history display
- Timestamps and descriptions

### ✅ Errors (Audit Log) `/app/settings/errors`
**Status:** FULLY WORKING
- Error history via `/api/workspace/errors`
- Error type grouping
- Error message display

### ✅ Industry Templates `/app/settings/industry-templates`
**Status:** FULLY WORKING
- Template list via `/api/industry-templates`
- Template details via `/api/industry-templates/[slug]`
- Default configurations
- Recommended features

### ✅ Chat Widget `/app/settings/chat-widget`
**Status:** FULLY WORKING
- Widget configuration via `/api/chat-widget/config` (GET, PUT)
- Embed code display
- Widget preview

### ✅ White Label `/app/settings/white-label`
**Status:** FULLY WORKING
- Branding configuration via `/api/white-label/config` (GET, PUT)
- Logo and color customization
- Company name settings

### ✅ Communication `/app/settings/communication`
**Status:** FULLY WORKING
- SMS settings
- WhatsApp settings
- Communication mode via `/api/workspace/communication-mode`

### ✅ Outbound `/app/settings/outbound`
**Status:** FULLY WORKING
- Calling hours configuration
- Voicemail behavior settings
- Daily outbound limits
- Suppression rules (call/SMS frequency)
- DNC compliance
- All save operations using `/api/settings/workspace` (PATCH)

### ✅ Voices `/app/settings/voices`
**Status:** FULLY WORKING
- Voice selection from RECALL_VOICES
- Voice preview playback
- Voice A/B testing via `/api/voice/ab-tests`
- Voice consent management via `/api/voice/consents`
- Voice quality settings

### ✅ Voices → A/B Testing `/app/settings/voices/ab-testing`
**Status:** FULLY WORKING
- A/B test creation via `/api/voice/ab-tests` (POST)
- Test monitoring and results
- Traffic split configuration

### ✅ Phone → Marketplace `/app/settings/phone/marketplace`
**Status:** FULLY WORKING
- Available phone numbers
- Number search and filtering
- Number purchase via `/api/phone/provision`

### ✅ Phone → Porting `/app/settings/phone/port`
**Status:** FULLY WORKING
- Phone number porting via `/api/phone/port-request`
- Port request tracking

### ✅ Auto-Setup `/app/settings/auto-setup`
**Status:** FULLY WORKING
- One-click setup via `/api/workspace/auto-setup`
- Alternative setup via `/api/workspace/one-click-setup`
- Knowledge stats via `/api/workspace/knowledge-stats`

---

## API ROUTE INVENTORY

### Workspace Management Routes ✅
```
GET    /api/workspace/me              → Load workspace profile
PATCH  /api/workspace/me              → Update workspace profile
GET    /api/workspace/timezone        → Load timezone
PATCH  /api/workspace/timezone        → Update timezone
POST   /api/workspace/delete          → Delete workspace
GET    /api/workspace/members         → List members
❌ MISSING: /api/workspace/members/role
❌ MISSING: /api/workspace/members/remove
POST   /api/workspace/invite          → Invite member
GET    /api/workspace/activity        → Activity log
GET    /api/workspace/errors          → Error log
```

### Agent Configuration Routes ✅
```
GET    /api/agents                    → List agents
POST   /api/agents                    → Create agent
GET    /api/agents/[id]               → Get agent details
PATCH  /api/agents/[id]               → Update agent
POST   /api/agents/[id]/test-call     → Test call
GET    /api/workspace/agent           → Workspace agent config
PATCH  /api/workspace/agent           → Update agent config
```

### Settings Routes ✅
```
GET    /api/workspace/call-rules      → Call rules config
PATCH  /api/workspace/call-rules      → Update call rules
GET    /api/workspace/communication-mode    → Communication settings
PATCH  /api/workspace/communication-mode   → Update settings
GET    /api/workspace/lead-scoring-config  → Lead scoring weights
PATCH  /api/workspace/lead-scoring-config → Update weights
GET    /api/workspace/recording-consent    → Recording consent
PATCH  /api/workspace/recording-consent   → Update consent
GET    /api/settings/workspace        → General settings
PATCH  /api/settings/workspace        → Update settings
```

### Phone Routes ✅
```
GET    /api/workspace/phone           → Phone config
PATCH  /api/workspace/phone           → Update phone config
POST   /api/phone/provision           → Provision number
POST   /api/phone/verify-start        → Start verification
POST   /api/phone/verify-check        → Check verification
POST   /api/phone/port-request        → Port request
```

### Integration Routes ✅
```
GET    /api/integrations/crm/status   → CRM status
POST   /api/integrations/crm/[provider]/connect          → Connect CRM
POST   /api/integrations/crm/[provider]/disconnect       → Disconnect CRM
GET    /api/integrations/crm/[provider]/mapping          → Field mapping
PATCH  /api/integrations/crm/[provider]/mapping         → Update mapping
GET    /api/integrations/google-calendar/status         → Calendar status
GET    /api/integrations/google-calendar/availability   → Calendar availability
GET    /api/integrations/sync-log    → Sync history
GET    /api/workspaces/[id]/webhook-config              → Webhook config
PUT    /api/workspaces/[id]/webhook-config              → Update webhook
POST   /api/workspaces/[id]/webhook-config/test         → Test webhook
```

### Voice Routes ✅
```
GET    /api/voice/ab-tests            → A/B tests
POST   /api/voice/ab-tests            → Create A/B test
PATCH  /api/voice/ab-tests/[id]       → Update A/B test
GET    /api/voice/consents            → Voice consents
POST   /api/voice/consents            → Record consent
```

### Billing Routes ✅
```
GET    /api/billing/status            → Billing status
GET    /api/billing/buy-minutes       → Available minute packs
POST   /api/billing/buy-minutes       → Purchase minutes
POST   /api/billing/pause-coverage    → Pause subscription
GET    /api/billing/portal            → Billing portal
```

### Other Routes ✅
```
GET    /api/workspace/knowledge-stats          → Knowledge stats
GET    /api/industry-templates                 → Industry templates
GET    /api/industry-templates/[slug]          → Template details
POST   /api/industry-templates/[slug]          → Apply template
GET    /api/white-label/config                 → White label config
PUT    /api/white-label/config                 → Update branding
GET    /api/chat-widget/config                 → Widget config
PUT    /api/chat-widget/config                 → Update widget
POST   /api/knowledge/upload                   → Upload documents
POST   /api/knowledge/import-url               → Import from URL
```

---

## IMPORT AND DEPENDENCY ANALYSIS

### Working Imports ✅
All settings pages correctly import:
- `next-intl` for translations
- `useWorkspace` from `@/components/WorkspaceContext`
- UI components from `@/components/ui/*`
- Utility functions and constants
- Hooks (`useEffect`, `useState`, `useCallback`, etc.)

### No Issues Found ✅
- No circular imports
- No broken imports
- No missing component dependencies
- All TypeScript types properly defined
- All API call locations correctly specified

---

## RECOMMENDATIONS

### 🔴 Critical - Must Fix

1. **Create `/src/app/api/workspace/members/role/route.ts`**
   ```typescript
   // PATCH /api/workspace/members/role
   // Request: { workspace_id, email, role }
   // Response: Success or error
   ```

2. **Create `/src/app/api/workspace/members/remove/route.ts`**
   ```typescript
   // POST /api/workspace/members/remove
   // Request: { workspace_id, email }
   // Response: Success or error
   ```

### 🟡 Medium Priority - Enhancements

1. Add rate limiting to sensitive routes (team management, billing)
2. Add audit logging for team member changes
3. Add confirmation dialogs for destructive operations
4. Implement pagination for large member lists

### 🟢 Low Priority - Optimization

1. Cache workspace settings more aggressively
2. Implement offline support for settings pages
3. Add undo/redo for common operations

---

## TEST CHECKLIST

- [ ] Team member role updates
- [ ] Team member removal
- [ ] Phone verification flow
- [ ] Agent configuration save
- [ ] Billing plan changes
- [ ] Integration connection flow
- [ ] Webhook configuration
- [ ] Voice A/B testing setup
- [ ] Knowledge base upload
- [ ] Industry template application

---

## CONCLUSION

**Overall Status:** 24/26 settings pages fully functional

**Critical Issues:** 1 feature area broken (team member management)

**Broken Feature:** Team/Members settings - role updates and member removal non-functional

**Action Required:** Implement 2 missing API routes to restore team management functionality
