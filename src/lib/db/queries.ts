/**
 * Revenue Operator - Database queries
 * Uses revenue_operator schema. Unsafe write guard: in production it is on unless
 * DISABLE_UNSAFE_WRITE_GUARD=true; otherwise use ENABLE_UNSAFE_WRITE_GUARD to opt in.
 */

import { createServerClient } from "./client";
import { wrapSchemaForGuards } from "@/lib/safety/unsafe-write-guard";

function shouldEnableUnsafeWriteGuard(): boolean {
  if (process.env.NODE_ENV === "production") {
    return process.env.DISABLE_UNSAFE_WRITE_GUARD !== "true";
  }
  return process.env.ENABLE_UNSAFE_WRITE_GUARD === "true";
}

export function getDb() {
  const client = createServerClient();
  const schema = client.schema("revenue_operator");
  if (shouldEnableUnsafeWriteGuard()) {
    return wrapSchemaForGuards(schema);
  }
  return schema;
}
