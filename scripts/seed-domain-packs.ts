#!/usr/bin/env tsx
/**
 * Seed global speech templates and policies for real_estate (UK, US-CA, US-NY). Idempotent.
 */

import { getDb } from "../src/lib/db/queries";

const GLOBAL_TEMPLATES = [
  { domain_type: "real_estate", jurisdiction: "UK", channel: "sms", intent_type: "follow_up", clause_type: "acknowledgment", template_key: "re_inquiry_ack", template_body: "Inquiry received. A response will follow." },
  { domain_type: "real_estate", jurisdiction: "UK", channel: "sms", intent_type: "confirm_booking", clause_type: "confirmation_request", template_key: "re_viewing_confirm", template_body: "Viewing scheduled for {{time}}. Confirm if this works." },
  { domain_type: "real_estate", jurisdiction: "UK", channel: "email", intent_type: "follow_up", clause_type: "acknowledgment", template_key: "re_inquiry_ack_email", template_body: "Your inquiry has been received. We will respond shortly." },
  { domain_type: "general", jurisdiction: "UK", channel: "sms", intent_type: "follow_up", clause_type: "acknowledgment", template_key: "general_ack", template_body: "Received. A response will follow." },
  { domain_type: "general", jurisdiction: "UK", channel: "sms", intent_type: "follow_up", clause_type: "passthrough", template_key: "general_passthrough_sms", template_body: "{{content}}" },
  { domain_type: "general", jurisdiction: "UK", channel: "email", intent_type: "follow_up", clause_type: "passthrough", template_key: "general_passthrough_email", template_body: "{{content}}" },
  { domain_type: "general", jurisdiction: "UK", channel: "sms", intent_type: "first_record_send", clause_type: "first_record_send", template_key: "first_record_send_sms", template_body: "This matches what we agreed. Adjust it if anything is off." },
  { domain_type: "general", jurisdiction: "UK", channel: "email", intent_type: "first_record_send", clause_type: "first_record_send", template_key: "first_record_send_email", template_body: "This matches what we agreed. Adjust it if anything is off." },
];

const GLOBAL_POLICIES = [
  { domain_type: "real_estate", jurisdiction: "UK", channel: "sms", policy_key: "re_uk_sms", policy_json: { banned_phrases: [], required_clauses: [], forbidden_terms_by_intent: [] } },
  { domain_type: "general", jurisdiction: "UK", channel: "sms", policy_key: "general_uk_sms", policy_json: { banned_phrases: [], required_clauses: [], forbidden_terms_by_intent: [] } },
];

async function main() {
  const db = getDb();

  for (const t of GLOBAL_TEMPLATES) {
    const { data: existing } = await db
      .from("speech_templates")
      .select("id")
      .is("workspace_id", null)
      .eq("domain_type", t.domain_type)
      .eq("jurisdiction", t.jurisdiction)
      .eq("channel", t.channel)
      .eq("intent_type", t.intent_type)
      .eq("clause_type", (t as { clause_type: string }).clause_type)
      .eq("template_key", t.template_key)
      .maybeSingle();

    if (!existing) {
      await db.from("speech_templates").insert({
        workspace_id: null,
        domain_type: t.domain_type,
        jurisdiction: t.jurisdiction,
        channel: t.channel,
        intent_type: t.intent_type,
        clause_type: (t as { clause_type: string }).clause_type,
        template_key: t.template_key,
        template_body: t.template_body,
        version: 1,
        status: "approved",
      });
      console.log("Inserted template:", t.template_key);
    }
  }

  for (const p of GLOBAL_POLICIES) {
    const { data: existing } = await db
      .from("speech_policies")
      .select("id")
      .is("workspace_id", null)
      .eq("domain_type", p.domain_type)
      .eq("jurisdiction", p.jurisdiction)
      .eq("channel", p.channel)
      .eq("policy_key", p.policy_key)
      .maybeSingle();

    if (!existing) {
      await db.from("speech_policies").insert({
        workspace_id: null,
        domain_type: p.domain_type,
        jurisdiction: p.jurisdiction,
        channel: p.channel,
        policy_key: p.policy_key,
        policy_json: p.policy_json,
        version: 1,
        status: "approved",
      });
      console.log("Inserted policy:", p.policy_key);
    }
  }

  console.log("Seed complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
