/**
 * SourceAdapter — all inbound channels implement this.
 * verify request → normalize to NormalizedInboundEvent → pipeline upserts and enqueues.
 */

import type { NormalizedInboundEvent } from "@/lib/universal-model";

export interface SourceAdapterResult {
  success: boolean;
  webhook_id?: string;
  decision_lead_id?: string | null;
  decision_workspace_id?: string | null;
  error?: string;
}

/**
 * Verify the incoming request (signature, token, etc.) and return whether to process.
 */
export type VerifyRequest = (req: Request) => Promise<boolean>;

/**
 * Normalize raw payload into Universal Conversation Model event.
 */
export type NormalizeInbound = (req: Request) => Promise<NormalizedInboundEvent | null>;

export interface SourceAdapter {
  channel: string;
  verify: VerifyRequest;
  normalize: NormalizeInbound;
}
