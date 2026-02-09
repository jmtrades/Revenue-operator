/**
 * Channel capability truth. Check before sending.
 * Fallback: ask for alternative contact OR switch to supported channel.
 */

import { getDb } from "@/lib/db/queries";

export interface ChannelCapability {
  channel: string;
  can_send: boolean;
  can_receive: boolean;
  can_call: boolean;
  supports_optout: boolean;
}

const DEFAULTS: ChannelCapability[] = [
  { channel: "email", can_send: true, can_receive: true, can_call: false, supports_optout: true },
  { channel: "sms", can_send: true, can_receive: true, can_call: false, supports_optout: true },
  { channel: "whatsapp", can_send: true, can_receive: true, can_call: false, supports_optout: true },
  { channel: "web", can_send: true, can_receive: true, can_call: false, supports_optout: true },
];

let _cache: Map<string, ChannelCapability> | null = null;

async function getCapabilities(): Promise<Map<string, ChannelCapability>> {
  if (_cache) return _cache;
  try {
    const db = getDb();
    const { data } = await db.from("channel_capabilities").select("*");
    _cache = new Map();
    for (const row of data ?? []) {
      _cache.set((row as { channel: string }).channel, row as ChannelCapability);
    }
    for (const d of DEFAULTS) {
      if (!_cache.has(d.channel)) _cache.set(d.channel, d);
    }
  } catch {
    _cache = new Map(DEFAULTS.map((d) => [d.channel, d]));
  }
  return _cache;
}

export async function canSend(channel: string): Promise<boolean> {
  const caps = await getCapabilities();
  return caps.get(channel)?.can_send ?? true;
}

export async function getFallbackChannel(currentChannel: string): Promise<string | null> {
  const caps = await getCapabilities();
  for (const [ch, c] of caps) {
    if (ch !== currentChannel && c.can_send) return ch;
  }
  return null;
}
