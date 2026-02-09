/**
 * Revenue Operator - Database queries
 * Uses revenue_operator schema
 */

import { createServerClient } from "./client";

export function getDb() {
  const client = createServerClient();
  return client.schema("revenue_operator");
}
