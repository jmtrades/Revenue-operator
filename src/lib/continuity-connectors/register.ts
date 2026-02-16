/**
 * Register built-in adapters. System operates with one or more sources.
 * Record: shared_transactions via getPublicEntryByExternalRef.
 * Communication/Payment: wired via delivery/provider and reconciliation; adapters can be registered by feature code.
 */

import { registerAdapter } from "./index";
import { getPublicEntryByExternalRef } from "@/lib/shared-transaction-assurance";

const recordAdapter = {
  kind: "record" as const,
  getByExternalRef: async (externalRef: string) => {
    const entry = await getPublicEntryByExternalRef(externalRef);
    if (!entry) return null;
    return {
      externalRef: entry.external_ref,
      subjectType: entry.subject_type,
      state: entry.state,
      lastEventAt: entry.last_event_at,
    };
  },
};
registerAdapter(recordAdapter);
