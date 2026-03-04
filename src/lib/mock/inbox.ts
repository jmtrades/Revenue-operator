/**
 * Mock data for /app/inbox — Omnichannel message center.
 * Frontend-only; no backend.
 */

export type InboxChannel = "phone" | "sms" | "email";
export type InboxStatus = "Open" | "Resolved" | "Pending";

export interface InboxMessage {
  id: string;
  sender: "agent" | "contact";
  content: string;
  timestamp: string;
  channel: InboxChannel;
  isCall?: boolean;
  callId?: string;
  durationSeconds?: number;
  outcome?: string;
}

export interface InboxThread {
  id: string;
  contactName: string;
  contactPhone: string;
  channel: InboxChannel;
  lastMessage: string;
  lastMessageAt: string;
  unread: boolean;
  status: InboxStatus;
  messages: InboxMessage[];
}

const now = Date.now();
const minute = 60 * 1000;
const hour = 60 * minute;
const day = 24 * hour;

function ts(offsetMs: number): string {
  return new Date(now - offsetMs).toISOString();
}

export const MOCK_INBOX_THREADS: InboxThread[] = [
  {
    id: "th-1",
    contactName: "Mike Johnson",
    contactPhone: "(555) 201-9834",
    channel: "phone",
    lastMessage: "AI confirmed appointment for Tuesday at 2 PM.",
    lastMessageAt: ts(2 * minute),
    unread: true,
    status: "Open",
    messages: [
      {
        id: "m-1-1",
        sender: "agent",
        content: "Inbound call from Mike Johnson — interested in your services, asking about availability.",
        timestamp: ts(6 * minute),
        channel: "phone",
        isCall: true,
        callId: "call_4821",
        durationSeconds: 240,
        outcome: "Lead qualified",
      },
      {
        id: "m-1-2",
        sender: "agent",
        content: "Absolutely! I have openings on Tuesday and Thursday. What time works best for you?",
        timestamp: ts(5 * minute),
        channel: "phone",
      },
      {
        id: "m-1-3",
        sender: "contact",
        content: "Tuesday afternoon works.",
        timestamp: ts(4 * minute),
        channel: "phone",
      },
      {
        id: "m-1-4",
        sender: "agent",
        content: "Thanks. I’ve booked you for Tuesday at 2 PM. You'll get a confirmation text shortly.",
        timestamp: ts(2 * minute),
        channel: "phone",
      },
    ],
  },
  {
    id: "th-2",
    contactName: "Sarah Chen",
    contactPhone: "(555) 334-9982",
    channel: "sms",
    lastMessage: "Ok, Tuesday at 3 PM works.",
    lastMessageAt: ts(30 * minute),
    unread: false,
    status: "Resolved",
    messages: [
      {
        id: "m-2-1",
        sender: "agent",
        content: "Hi Sarah, we have availability on Tuesday at 3 PM or Wednesday at 11 AM. What works best?",
        timestamp: ts(60 * minute),
        channel: "sms",
      },
      {
        id: "m-2-2",
        sender: "contact",
        content: "Ok, Tuesday at 3 PM works.",
        timestamp: ts(30 * minute),
        channel: "sms",
      },
    ],
  },
  {
    id: "th-3",
    contactName: "James Wilson",
    contactPhone: "(555) 102-3344",
    channel: "phone",
    lastMessage: "AI left voicemail with estimate details.",
    lastMessageAt: ts(90 * minute),
    unread: true,
    status: "Open",
    messages: [
      {
        id: "m-3-1",
        sender: "agent",
        content: "Outbound follow-up call about roof inspection.",
        timestamp: ts(2 * hour),
        channel: "phone",
        isCall: true,
        callId: "call_4720",
        durationSeconds: 180,
        outcome: "Voicemail left",
      },
      {
        id: "m-3-2",
        sender: "agent",
        content: "I left you a quick voicemail with the estimate details. Reply here if you have any questions.",
        timestamp: ts(90 * minute),
        channel: "sms",
      },
    ],
  },
  {
    id: "th-4",
    contactName: "Olivia Martinez",
    contactPhone: "(555) 777-1200",
    channel: "sms",
    lastMessage: "Yes, please move it to Thursday.",
    lastMessageAt: ts(3 * hour),
    unread: false,
    status: "Pending",
    messages: [
      {
        id: "m-4-1",
        sender: "contact",
        content: "Can I move my appointment to Thursday afternoon?",
        timestamp: ts(4 * hour),
        channel: "sms",
      },
      {
        id: "m-4-2",
        sender: "agent",
        content: "Yes, we can do Thursday at 2 PM or 4 PM. Which do you prefer?",
        timestamp: ts(3.5 * hour),
        channel: "sms",
      },
      {
        id: "m-4-3",
        sender: "contact",
        content: "Yes, please move it to Thursday.",
        timestamp: ts(3 * hour),
        channel: "sms",
      },
    ],
  },
  {
    id: "th-5",
    contactName: "David Kim",
    contactPhone: "(555) 441-2200",
    channel: "email",
    lastMessage: "Thanks for sending over the quote.",
    lastMessageAt: ts(5 * hour),
    unread: false,
    status: "Resolved",
    messages: [
      {
        id: "m-5-1",
        sender: "contact",
        content: "Hi, can you send a written quote for the full system replacement?",
        timestamp: ts(7 * hour),
        channel: "email",
      },
      {
        id: "m-5-2",
        sender: "agent",
        content: "Absolutely. I’ve attached a detailed quote to this email.",
        timestamp: ts(6 * hour),
        channel: "email",
      },
      {
        id: "m-5-3",
        sender: "contact",
        content: "Thanks for sending over the quote.",
        timestamp: ts(5 * hour),
        channel: "email",
      },
    ],
  },
  {
    id: "th-6",
    contactName: "Emma Davis",
    contactPhone: "(555) 888-4400",
    channel: "phone",
    lastMessage: "AI scheduled follow-up for next week.",
    lastMessageAt: ts(7 * hour),
    unread: false,
    status: "Open",
    messages: [
      {
        id: "m-6-1",
        sender: "agent",
        content: "Call with Emma about annual maintenance plan renewal.",
        timestamp: ts(8 * hour),
        channel: "phone",
        isCall: true,
        callId: "call_4701",
        durationSeconds: 300,
        outcome: "Follow-up scheduled",
      },
      {
        id: "m-6-2",
        sender: "agent",
        content: "I’ve scheduled a follow-up for next week to confirm your decision.",
        timestamp: ts(7 * hour),
        channel: "phone",
      },
    ],
  },
  {
    id: "th-7",
    contactName: "Noah Lee",
    contactPhone: "(555) 930-1122",
    channel: "sms",
    lastMessage: "I'll call back later today.",
    lastMessageAt: ts(9 * hour),
    unread: false,
    status: "Open",
    messages: [
      {
        id: "m-7-1",
        sender: "agent",
        content: "We tried to reach you about your appointment. Do you still want to keep it?",
        timestamp: ts(10 * hour),
        channel: "sms",
      },
      {
        id: "m-7-2",
        sender: "contact",
        content: "I'll call back later today.",
        timestamp: ts(9 * hour),
        channel: "sms",
      },
    ],
  },
  {
    id: "th-8",
    contactName: "Lisa Brown",
    contactPhone: "(555) 555-3200",
    channel: "phone",
    lastMessage: "Emergency call — AI escalated to on-call technician.",
    lastMessageAt: ts(12 * hour),
    unread: true,
    status: "Open",
    messages: [
      {
        id: "m-8-1",
        sender: "agent",
        content: "Emergency inbound call about burst pipe in basement.",
        timestamp: ts(12 * hour),
        channel: "phone",
        isCall: true,
        callId: "call_4690",
        durationSeconds: 180,
        outcome: "Escalated to on-call",
      },
    ],
  },
  {
    id: "th-9",
    contactName: "Ava Patel",
    contactPhone: "(555) 222-9183",
    channel: "phone",
    lastMessage: "AI confirmed reschedule for Friday at 1 PM.",
    lastMessageAt: ts(20 * hour),
    unread: false,
    status: "Resolved",
    messages: [
      {
        id: "m-9-1",
        sender: "contact",
        content: "I need to move my appointment to Friday if possible.",
        timestamp: ts(22 * hour),
        channel: "phone",
      },
      {
        id: "m-9-2",
        sender: "agent",
        content: "No problem — you’re now booked for Friday at 1 PM.",
        timestamp: ts(20 * hour),
        channel: "phone",
      },
    ],
  },
  {
    id: "th-10",
    contactName: "Robert King",
    contactPhone: "(555) 909-2201",
    channel: "email",
    lastMessage: "Can you send me the invoice as a PDF?",
    lastMessageAt: ts(2 * day),
    unread: false,
    status: "Pending",
    messages: [
      {
        id: "m-10-1",
        sender: "contact",
        content: "Can you send me the invoice as a PDF?",
        timestamp: ts(2 * day),
        channel: "email",
      },
    ],
  },
  {
    id: "th-11",
    contactName: "Isabella Rossi",
    contactPhone: "(555) 301-7766",
    channel: "phone",
    lastMessage: "AI documented that customer will call back next week.",
    lastMessageAt: ts(3 * day),
    unread: false,
    status: "Open",
    messages: [
      {
        id: "m-11-1",
        sender: "agent",
        content: "Call about remodel estimate; customer needs to check dates with partner.",
        timestamp: ts(3 * day),
        channel: "phone",
        isCall: true,
        callId: "call_4602",
        durationSeconds: 420,
        outcome: "Customer to call back",
      },
    ],
  },
  {
    id: "th-12",
    contactName: "Jacob Miller",
    contactPhone: "(555) 848-1133",
    channel: "sms",
    lastMessage: "Yes, I received the confirmation.",
    lastMessageAt: ts(4 * day),
    unread: false,
    status: "Resolved",
    messages: [
      {
        id: "m-12-1",
        sender: "agent",
        content: "Just confirming you received your booking confirmation for Monday.",
        timestamp: ts(4 * day),
        channel: "sms",
      },
      {
        id: "m-12-2",
        sender: "contact",
        content: "Yes, I received the confirmation.",
        timestamp: ts(4 * day - 30 * minute),
        channel: "sms",
      },
    ],
  },
  {
    id: "th-13",
    contactName: "Sophia Nguyen",
    contactPhone: "(555) 676-3322",
    channel: "phone",
    lastMessage: "AI sent link to online intake form.",
    lastMessageAt: ts(5 * day),
    unread: false,
    status: "Open",
    messages: [
      {
        id: "m-13-1",
        sender: "agent",
        content: "Call about new patient intake; AI collected basic info and sent form link.",
        timestamp: ts(5 * day),
        channel: "phone",
        isCall: true,
        callId: "call_4520",
        durationSeconds: 260,
        outcome: "Intake started",
      },
    ],
  },
  {
    id: "th-14",
    contactName: "Liam Thompson",
    contactPhone: "(555) 484-9981",
    channel: "sms",
    lastMessage: "Got it, I’ll be there.",
    lastMessageAt: ts(6 * day),
    unread: false,
    status: "Resolved",
    messages: [
      {
        id: "m-14-1",
        sender: "agent",
        content: "Reminder: Your appointment is tomorrow at 9 AM. Reply YES to confirm or NO to reschedule.",
        timestamp: ts(6 * day),
        channel: "sms",
      },
      {
        id: "m-14-2",
        sender: "contact",
        content: "Got it, I’ll be there.",
        timestamp: ts(6 * day - 15 * minute),
        channel: "sms",
      },
    ],
  },
  {
    id: "th-15",
    contactName: "Grace Lee",
    contactPhone: "(555) 742-6600",
    channel: "phone",
    lastMessage: "AI marked call as urgent and notified team.",
    lastMessageAt: ts(8 * day),
    unread: false,
    status: "Open",
    messages: [
      {
        id: "m-15-1",
        sender: "agent",
        content: "Emergency call flagged as urgent due to health concerns. Team notified.",
        timestamp: ts(8 * day),
        channel: "phone",
        isCall: true,
        callId: "call_4401",
        durationSeconds: 210,
        outcome: "Urgent escalation",
      },
    ],
  },
];

