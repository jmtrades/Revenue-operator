/**
 * Mock data for /app/campaigns — Outbound campaign manager.
 * Frontend-only; no backend.
 */

export type CampaignStatus = "Active" | "Paused" | "Completed";
export type CampaignType = "Outbound calls" | "SMS only" | "SMS + Call";

export interface Campaign {
  id: string;
  name: string;
  status: CampaignStatus;
  type: CampaignType;
  audience: number;
  contacted: number;
  appointments: number;
  startedAt: string;
  endedAt?: string;
  conversionRate: number;
  /** For detail chart: daily contacted + appointments */
  dailyData: { date: string; contacted: number; appointments: number }[];
  /** For detail: avg calls per contact */
  avgCallsPerContact?: number;
  /** Preview contacts for detail table */
  contactPreview: { id: string; name: string; phone: string; status: string; lastAttempt: string }[];
}

export const MOCK_CAMPAIGNS: Campaign[] = [
  {
    id: "cmp-1",
    name: "Spring Re-engagement Campaign",
    status: "Active",
    type: "Outbound calls",
    audience: 250,
    contacted: 180,
    appointments: 34,
    startedAt: "2026-02-15T00:00:00Z",
    conversionRate: 18.9,
    avgCallsPerContact: 1.2,
    dailyData: [
      { date: "2026-02-15", contacted: 25, appointments: 4 },
      { date: "2026-02-16", contacted: 28, appointments: 5 },
      { date: "2026-02-17", contacted: 22, appointments: 3 },
      { date: "2026-02-18", contacted: 30, appointments: 6 },
      { date: "2026-02-19", contacted: 26, appointments: 4 },
      { date: "2026-02-20", contacted: 24, appointments: 5 },
      { date: "2026-02-21", contacted: 25, appointments: 7 },
    ],
    contactPreview: [
      { id: "c1", name: "John Smith", phone: "(555) 201-9834", status: "Scheduled", lastAttempt: "2026-03-01" },
      { id: "c2", name: "Maria Garcia", phone: "(555) 334-1122", status: "Contacted", lastAttempt: "2026-03-02" },
      { id: "c3", name: "David Lee", phone: "(555) 445-2233", status: "No Answer", lastAttempt: "2026-02-28" },
      { id: "c4", name: "Sarah Chen", phone: "(555) 556-3344", status: "Scheduled", lastAttempt: "2026-03-01" },
      { id: "c5", name: "James Wilson", phone: "(555) 667-4455", status: "Contacted", lastAttempt: "2026-03-02" },
      { id: "c6", name: "Emily Park", phone: "(555) 778-5566", status: "Opted Out", lastAttempt: "2026-02-20" },
      { id: "c7", name: "Robert Kim", phone: "(555) 889-6677", status: "Scheduled", lastAttempt: "2026-02-28" },
      { id: "c8", name: "Lisa Brown", phone: "(555) 990-7788", status: "No Answer", lastAttempt: "2026-03-02" },
      { id: "c9", name: "Michael Davis", phone: "(555) 101-8899", status: "Contacted", lastAttempt: "2026-03-01" },
      { id: "c10", name: "Anna Martinez", phone: "(555) 212-9900", status: "Scheduled", lastAttempt: "2026-02-27" },
    ],
  },
  {
    id: "cmp-2",
    name: "Overdue Client Follow-Up",
    status: "Active",
    type: "SMS + Call",
    audience: 120,
    contacted: 95,
    appointments: 22,
    startedAt: "2026-02-28T00:00:00Z",
    conversionRate: 23.2,
    avgCallsPerContact: 1.4,
    dailyData: [
      { date: "2026-02-28", contacted: 40, appointments: 8 },
      { date: "2026-03-01", contacted: 35, appointments: 9 },
      { date: "2026-03-02", contacted: 20, appointments: 5 },
    ],
    contactPreview: [
      { id: "d1", name: "Tom Harris", phone: "(555) 303-1010", status: "Scheduled", lastAttempt: "2026-03-02" },
      { id: "d2", name: "Nancy Clark", phone: "(555) 414-2020", status: "Contacted", lastAttempt: "2026-03-02" },
      { id: "d3", name: "Paul White", phone: "(555) 525-3030", status: "No Answer", lastAttempt: "2026-03-01" },
      { id: "d4", name: "Julia Adams", phone: "(555) 636-4040", status: "Scheduled", lastAttempt: "2026-03-01" },
      { id: "d5", name: "Chris Evans", phone: "(555) 747-5050", status: "Contacted", lastAttempt: "2026-02-28" },
      { id: "d6", name: "Kate Moore", phone: "(555) 858-6060", status: "Scheduled", lastAttempt: "2026-03-02" },
      { id: "d7", name: "Steve Young", phone: "(555) 969-7070", status: "Opted Out", lastAttempt: "2026-02-28" },
      { id: "d8", name: "Rachel Green", phone: "(555) 070-8080", status: "Contacted", lastAttempt: "2026-03-01" },
      { id: "d9", name: "Mark Taylor", phone: "(555) 181-9090", status: "No Answer", lastAttempt: "2026-03-02" },
      { id: "d10", name: "Amy Wright", phone: "(555) 292-0101", status: "Scheduled", lastAttempt: "2026-02-28" },
    ],
  },
  {
    id: "cmp-3",
    name: "New Customer Welcome",
    status: "Paused",
    type: "SMS only",
    audience: 45,
    contacted: 30,
    appointments: 8,
    startedAt: "2026-03-01T00:00:00Z",
    conversionRate: 26.7,
    avgCallsPerContact: 0,
    dailyData: [
      { date: "2026-03-01", contacted: 30, appointments: 8 },
    ],
    contactPreview: [
      { id: "n1", name: "Brian Hall", phone: "(555) 393-1111", status: "Scheduled", lastAttempt: "2026-03-01" },
      { id: "n2", name: "Sandra King", phone: "(555) 504-2222", status: "Contacted", lastAttempt: "2026-03-01" },
      { id: "n3", name: "Kevin Scott", phone: "(555) 615-3333", status: "Contacted", lastAttempt: "2026-03-01" },
      { id: "n4", name: "Laura Hill", phone: "(555) 726-4444", status: "Scheduled", lastAttempt: "2026-03-01" },
      { id: "n5", name: "Dan Cooper", phone: "(555) 837-5555", status: "No Answer", lastAttempt: "2026-03-01" },
      { id: "n6", name: "Patricia Ward", phone: "(555) 948-6666", status: "Contacted", lastAttempt: "2026-03-01" },
      { id: "n7", name: "Frank Bennett", phone: "(555) 059-7777", status: "Scheduled", lastAttempt: "2026-03-01" },
      { id: "n8", name: "Helen Brooks", phone: "(555) 160-8888", status: "Contacted", lastAttempt: "2026-03-01" },
      { id: "n9", name: "Eric Sanders", phone: "(555) 271-9999", status: "Opted Out", lastAttempt: "2026-03-01" },
      { id: "n10", name: "Diana Price", phone: "(555) 382-0000", status: "Scheduled", lastAttempt: "2026-03-01" },
    ],
  },
  {
    id: "cmp-4",
    name: "Q1 Follow-Up Blitz",
    status: "Completed",
    type: "Outbound calls",
    audience: 300,
    contacted: 300,
    appointments: 51,
    startedAt: "2026-01-10T00:00:00Z",
    endedAt: "2026-01-31T00:00:00Z",
    conversionRate: 17.0,
    avgCallsPerContact: 1.8,
    dailyData: [
      { date: "2026-01-10", contacted: 15, appointments: 2 },
      { date: "2026-01-11", contacted: 18, appointments: 3 },
      { date: "2026-01-12", contacted: 20, appointments: 4 },
      { date: "2026-01-13", contacted: 22, appointments: 3 },
      { date: "2026-01-14", contacted: 25, appointments: 5 },
      { date: "2026-01-15", contacted: 28, appointments: 4 },
      { date: "2026-01-16", contacted: 30, appointments: 6 },
      { date: "2026-01-17", contacted: 25, appointments: 4 },
      { date: "2026-01-18", contacted: 22, appointments: 3 },
      { date: "2026-01-19", contacted: 20, appointments: 5 },
      { date: "2026-01-20", contacted: 18, appointments: 2 },
      { date: "2026-01-21", contacted: 15, appointments: 3 },
      { date: "2026-01-22", contacted: 18, appointments: 3 },
    ],
    contactPreview: [
      { id: "q1", name: "Oliver Stone", phone: "(555) 494-1212", status: "Scheduled", lastAttempt: "2026-01-25" },
      { id: "q2", name: "Emma Watson", phone: "(555) 505-2323", status: "Contacted", lastAttempt: "2026-01-30" },
      { id: "q3", name: "Jack Miller", phone: "(555) 616-3434", status: "No Answer", lastAttempt: "2026-01-20" },
      { id: "q4", name: "Sophie Turner", phone: "(555) 727-4545", status: "Scheduled", lastAttempt: "2026-01-28" },
      { id: "q5", name: "Liam Brown", phone: "(555) 838-5656", status: "Contacted", lastAttempt: "2026-01-31" },
      { id: "q6", name: "Olivia Jones", phone: "(555) 949-6767", status: "Opted Out", lastAttempt: "2026-01-15" },
      { id: "q7", name: "Noah Davis", phone: "(555) 050-7878", status: "Scheduled", lastAttempt: "2026-01-22" },
      { id: "q8", name: "Ava Wilson", phone: "(555) 161-8989", status: "Contacted", lastAttempt: "2026-01-29" },
      { id: "q9", name: "Ethan Moore", phone: "(555) 272-9090", status: "No Answer", lastAttempt: "2026-01-18" },
      { id: "q10", name: "Isabella Taylor", phone: "(555) 383-0101", status: "Scheduled", lastAttempt: "2026-01-27" },
    ],
  },
];

export const CAMPAIGN_TYPES: CampaignType[] = [
  "Outbound calls",
  "SMS only",
  "SMS + Call",
];

export const CAMPAIGN_STATUSES: CampaignStatus[] = ["Active", "Paused", "Completed"];
