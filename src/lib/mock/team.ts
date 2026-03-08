/**
 * Mock data for /app/team — Team members and roles.
 * Frontend-only; no backend.
 */

export type TeamRole = "owner" | "admin" | "manager" | "agent";

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: TeamRole;
  lastActive: string;
  joinedAt: string;
}

export interface PendingInvite {
  id: string;
  email: string;
  role: TeamRole;
  invitedAt: string;
}

export const ROLE_LABELS: Record<TeamRole, string> = {
  owner: "Owner",
  admin: "Admin",
  manager: "Manager",
  agent: "Agent",
};
export const ROLE_LABEL_OVERRIDE: Record<string, string> = {
  operator: "Agent",
};

export const ROLE_DESCRIPTIONS: Record<TeamRole, string> = {
  owner: "Full access, billing, can delete account",
  admin: "Full access except billing and account deletion",
  manager: "Can view all data, manage agents, view analytics, cannot change settings or team",
  agent: "Can view assigned calls and leads only",
};

/** Permissions matrix: permission id -> role -> has access */
export const PERMISSIONS_MATRIX: { id: string; label: string; roles: Record<TeamRole, boolean> }[] = [
  { id: "view_calls", label: "View calls", roles: { owner: true, admin: true, manager: true, agent: true } },
  { id: "manage_agents", label: "Manage agents", roles: { owner: true, admin: true, manager: true, agent: false } },
  { id: "view_analytics", label: "View analytics", roles: { owner: true, admin: true, manager: true, agent: false } },
  { id: "manage_team", label: "Manage team", roles: { owner: true, admin: true, manager: false, agent: false } },
  { id: "billing", label: "Billing", roles: { owner: true, admin: false, manager: false, agent: false } },
  { id: "account_settings", label: "Account settings", roles: { owner: true, admin: false, manager: false, agent: false } },
];

const now = Date.now();
const day = 24 * 60 * 60 * 1000;

export const MOCK_TEAM_MEMBERS: TeamMember[] = [
  {
    id: "tm-1",
    name: "You",
    email: "you@company.com",
    role: "owner",
    lastActive: new Date(now).toISOString(),
    joinedAt: "2026-01-10T00:00:00Z",
  },
  {
    id: "tm-2",
    name: "Sarah Chen",
    email: "sarah@company.com",
    role: "admin",
    lastActive: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
    joinedAt: "2026-01-15T00:00:00Z",
  },
  {
    id: "tm-3",
    name: "Mike Rodriguez",
    email: "mike@company.com",
    role: "manager",
    lastActive: new Date(now - 1 * day).toISOString(),
    joinedAt: "2026-02-01T00:00:00Z",
  },
  {
    id: "tm-4",
    name: "Emily Park",
    email: "emily@company.com",
    role: "agent",
    lastActive: new Date(now - 3 * 60 * 60 * 1000).toISOString(),
    joinedAt: "2026-02-10T00:00:00Z",
  },
  {
    id: "tm-5",
    name: "David Kim",
    email: "david@company.com",
    role: "agent",
    lastActive: new Date(now - 5 * day).toISOString(),
    joinedAt: "2026-03-01T00:00:00Z",
  },
];

export const MOCK_PENDING_INVITES: PendingInvite[] = [
  {
    id: "inv-1",
    email: "jordan@company.com",
    role: "agent",
    invitedAt: new Date(now - 2 * day).toISOString(),
  },
];

export const INVITABLE_ROLES: TeamRole[] = ["admin", "manager", "agent"];
