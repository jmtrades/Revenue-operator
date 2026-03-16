/**
 * Presence Simulation — occasional "just checking" / "give me a sec" / "one moment".
 * Max once per conversation.
 */

import { getDb } from "@/lib/db/queries";

const PRESENCE_PHRASES = [
  "give me a sec — ",
  "one moment — ",
  "just checking — ",
];

/**
 * If this lead has not used a presence phrase yet, optionally prepend one (~15% chance).
 */
export async function maybePrependPresencePhrase(
  leadId: string,
  message: string
): Promise<{ message: string; used: boolean }> {
  const db = getDb();
  const { data: meta } = await db
    .from("human_presence_meta")
    .select("presence_phrase_used")
    .eq("lead_id", leadId)
    .maybeSingle();

  if ((meta as { presence_phrase_used?: boolean } | null)?.presence_phrase_used) {
    return { message, used: false };
  }
  if (Math.random() >= 0.15) return { message, used: false };

  const phrase = PRESENCE_PHRASES[Math.floor(Math.random() * PRESENCE_PHRASES.length)]!;
  const out = phrase + message.trim();

  await db
    .from("human_presence_meta")
    .upsert(
      {
        lead_id: leadId,
        presence_phrase_used: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "lead_id" }
    );

  return { message: out, used: true };
}
