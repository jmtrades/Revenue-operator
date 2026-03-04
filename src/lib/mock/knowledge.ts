/**
 * Mock data for /app/knowledge — Knowledge base manager.
 * All data is client-side only; no backend.
 */

export type KnowledgeType = "FAQ" | "Document" | "Website" | "Custom";
export type KnowledgeStatus = "Active" | "Draft" | "Processing";

export interface KnowledgeEntry {
  id: string;
  title: string;
  type: KnowledgeType;
  content: string;
  wordCount: number;
  lastUpdated: string;
  status: KnowledgeStatus;
  usageCount: number;
  gapFlag: boolean;
  /** FAQ only */
  question?: string;
  /** Website only */
  url?: string;
  /** Document only — mock filename */
  fileName?: string;
}

export interface KnowledgeGap {
  id: string;
  topic: string;
  askCount: number;
}

export const MOCK_KNOWLEDGE_ENTRIES: KnowledgeEntry[] = [
  {
    id: "kb-1",
    title: "Business Hours & Location",
    type: "FAQ",
    content: "We're open Monday–Friday 8 AM–6 PM, Saturday 9 AM–2 PM. Closed Sundays. Visit us at 123 Main St.",
    wordCount: 24,
    lastUpdated: "2025-02-28T14:00:00Z",
    status: "Active",
    usageCount: 145,
    gapFlag: false,
    question: "What are your hours and where are you located?",
  },
  {
    id: "kb-2",
    title: "Service Pricing Guide",
    type: "Document",
    content: "Standard call: $89. Hourly rate: $120. Emergency after hours: $185. Premium packages available.",
    wordCount: 18,
    lastUpdated: "2025-02-27T10:30:00Z",
    status: "Active",
    usageCount: 89,
    gapFlag: false,
    fileName: "pricing-guide.pdf",
  },
  {
    id: "kb-3",
    title: "Emergency Service Policy",
    type: "FAQ",
    content: "Emergency service available 24/7. Call-back within 30 minutes. Same-day dispatch when possible. Surcharge applies after 6 PM and on weekends.",
    wordCount: 28,
    lastUpdated: "2025-02-26T09:15:00Z",
    status: "Active",
    usageCount: 67,
    gapFlag: false,
    question: "Do you offer emergency service?",
  },
  {
    id: "kb-4",
    title: "Insurance & Payment Options",
    type: "FAQ",
    content: "We accept most major insurance plans. Payment due at time of service. Cash, card, and financing available through our partner.",
    wordCount: 26,
    lastUpdated: "2025-02-25T16:45:00Z",
    status: "Active",
    usageCount: 34,
    gapFlag: false,
    question: "What insurance and payment options do you accept?",
  },
  {
    id: "kb-5",
    title: "Warranty Information",
    type: "Document",
    content: "1-year labor warranty on all work. Manufacturer warranties apply to parts. Extended warranties available for purchase.",
    wordCount: 22,
    lastUpdated: "2025-02-20T11:00:00Z",
    status: "Draft",
    usageCount: 0,
    gapFlag: false,
    fileName: "warranty.pdf",
  },
  {
    id: "kb-6",
    title: "Weekend Availability",
    type: "Custom",
    content: "Limited weekend slots. Saturday 9 AM–2 PM by appointment only.",
    wordCount: 12,
    lastUpdated: "2025-02-18T08:00:00Z",
    status: "Draft",
    usageCount: 0,
    gapFlag: true,
  },
  {
    id: "kb-7",
    title: "Company About Us",
    type: "Website",
    content: "Indexed 12 pages from company website. Services, team, and contact info extracted.",
    wordCount: 420,
    lastUpdated: "2025-02-22T13:20:00Z",
    status: "Active",
    usageCount: 52,
    gapFlag: false,
    url: "https://example.com",
  },
  {
    id: "kb-8",
    title: "Service Area & Coverage",
    type: "FAQ",
    content: "We serve a 25-mile radius from downtown. Some suburbs may have extended wait times. Call to confirm your address is in zone.",
    wordCount: 32,
    lastUpdated: "2025-02-24T15:00:00Z",
    status: "Active",
    usageCount: 41,
    gapFlag: false,
    question: "Do you serve my area?",
  },
  {
    id: "kb-9",
    title: "Cancellation Policy",
    type: "Custom",
    content: "Cancel or reschedule at least 4 hours in advance. No-shows may be charged a $50 fee. Repeated no-shows may require prepayment.",
    wordCount: 28,
    lastUpdated: "2025-02-23T12:00:00Z",
    status: "Active",
    usageCount: 28,
    gapFlag: false,
  },
  {
    id: "kb-10",
    title: "New Product Catalog",
    type: "Document",
    content: "Import in progress…",
    wordCount: 0,
    lastUpdated: "2025-03-01T09:00:00Z",
    status: "Processing",
    usageCount: 0,
    gapFlag: false,
    fileName: "catalog-2025.pdf",
  },
];

export const MOCK_KNOWLEDGE_GAPS: KnowledgeGap[] = [
  { id: "gap-1", topic: "Weekend availability", askCount: 47 },
  { id: "gap-2", topic: "Senior discounts", askCount: 23 },
  { id: "gap-3", topic: "Financing options", askCount: 18 },
  { id: "gap-4", topic: "Same-day appointment", askCount: 14 },
  { id: "gap-5", topic: "Pet-friendly services", askCount: 9 },
];
