/**
 * Voice A/B Test Resolver
 *
 * Resolves which voice should be used for a call by:
 * 1. Checking for active A/B tests
 * 2. If active, randomly assigning voice_a or voice_b based on traffic_split
 * 3. Incrementing the appropriate counter (calls_a or calls_b)
 * 4. Falling back to the workspace's active_voice_id
 */

import { getDb } from "@/lib/db/queries";
import { DEFAULT_RECALL_VOICE_ID, RECALL_VOICES } from "@/lib/constants/recall-voices";
import { log } from "@/lib/logger";

export interface ResolvedVoice {
  voiceId: string;
  abTestId?: string;
  variant?: "a" | "b";
}

/**
 * Resolve the voice to use for an outbound or inbound call.
 *
 * Priority:
 * 1. Active A/B test (random assignment with traffic_split)
 * 2. Workspace active_voice_id (from settings.channel_rules.voice_config)
 * 3. Default voice ID
 *
 * @param workspaceId - The workspace ID
 * @returns Resolved voice configuration with test tracking info
 */
export async function resolveVoiceForCall(workspaceId: string): Promise<ResolvedVoice> {
  const db = getDb();

  // Step 1: Check for active A/B tests
  const now = new Date().toISOString();
  const { data: abTests, error: abTestsError } = await db
    .from("voice_ab_tests")
    .select("id, voice_a, voice_b, traffic_split, status, start_date, end_date")
    .eq("workspace_id", workspaceId)
    .eq("status", "running")
    .gte("end_date", now) // Only tests that haven't ended (or have null end_date)
    .lte("start_date", now); // Only tests that have started

  if (abTestsError) {
    log("warn", "voice.resolve.ab_tests_error", {
      workspaceId,
      error: abTestsError.message
    });
  }

  // Find an active test (tests table may not exist yet, or no active tests)
  const activeTest = (abTests && abTests.length > 0) ? abTests[0] : null;

  if (activeTest) {
    const test = activeTest as {
      id: string;
      voice_a: string;
      voice_b: string;
      traffic_split: number;
      status: string;
      start_date: string;
      end_date: string | null;
    };

    // Randomly assign based on traffic_split
    // traffic_split represents the fraction that should receive voice_a
    // e.g., 0.7 means 70% get voice_a, 30% get voice_b
    const rand = Math.random();
    const assignToVoiceA = rand < test.traffic_split;
    const variant = assignToVoiceA ? "a" : "b";
    const selectedVoiceId = assignToVoiceA ? test.voice_a : test.voice_b;

    // Increment the appropriate counter
    try {
      const counterField = assignToVoiceA ? "calls_a" : "calls_b";
      const { error: updateError } = await db
        .from("voice_ab_tests")
        .update({
          [counterField]: db.rpc("increment_call_counter", {
            test_id: test.id,
            field: counterField,
          }),
          updated_at: now,
        })
        .eq("id", test.id);

      if (updateError) {
        // Fallback: try simple increment without RPC
        const { data: currentTest } = await db
          .from("voice_ab_tests")
          .select(counterField)
          .eq("id", test.id)
          .maybeSingle();

        if (currentTest) {
          const currentCount = (currentTest as Record<string, number>)[counterField] ?? 0;
          await db
            .from("voice_ab_tests")
            .update({
              [counterField]: currentCount + 1,
              updated_at: now,
            })
            .eq("id", test.id);
        }
      }

      log("info", "voice.resolve.ab_test_assigned", {
        workspaceId,
        abTestId: test.id,
        variant,
        voiceId: selectedVoiceId,
        trafficSplit: test.traffic_split,
      });

      return {
        voiceId: validateVoiceId(selectedVoiceId),
        abTestId: test.id,
        variant,
      };
    } catch (err) {
      log("error", "voice.resolve.counter_increment_failed", {
        workspaceId,
        abTestId: test.id,
        error: err instanceof Error ? err.message : String(err),
      });
      // Continue with selected voice even if counter update fails
      return {
        voiceId: validateVoiceId(selectedVoiceId),
        abTestId: test.id,
        variant,
      };
    }
  }

  // Step 2: Fall back to workspace active_voice_id
  const { data: settings, error: settingsError } = await db
    .from("settings")
    .select("channel_rules")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (settingsError) {
    log("warn", "voice.resolve.settings_error", {
      workspaceId,
      error: settingsError.message,
    });
  }

  let activeVoiceId: string | null = null;
  if (settings?.channel_rules && typeof settings.channel_rules === "object") {
    const channelRules = settings.channel_rules as Record<string, unknown>;
    if (channelRules.voice_config && typeof channelRules.voice_config === "object") {
      const voiceConfig = channelRules.voice_config as Record<string, unknown>;
      activeVoiceId = voiceConfig.active_voice_id ? String(voiceConfig.active_voice_id) : null;
    }
  }

  if (activeVoiceId) {
    log("info", "voice.resolve.workspace_active_voice", {
      workspaceId,
      voiceId: activeVoiceId,
    });
    return {
      voiceId: validateVoiceId(activeVoiceId),
    };
  }

  // Step 3: Fall back to default
  log("info", "voice.resolve.using_default", {
    workspaceId,
    voiceId: DEFAULT_RECALL_VOICE_ID,
  });

  return {
    voiceId: DEFAULT_RECALL_VOICE_ID,
  };
}

/**
 * Validate a voice ID against known voices.
 * Falls back to default if voice is unknown or invalid.
 */
export function validateVoiceId(rawVoiceId: string | null | undefined): string {
  const vid = (rawVoiceId ?? "").trim();
  if (!vid) return DEFAULT_RECALL_VOICE_ID;

  // Check if it matches a known voice ID
  if (RECALL_VOICES.some((v) => v.id === vid)) return vid;

  // Try matching by name (case-insensitive)
  const byName = RECALL_VOICES.find((v) => v.name.toLowerCase() === vid.toLowerCase());
  if (byName) return byName.id;

  // Unknown voice ID — fall back to default
  log("warn", "voice.resolve.unknown_voice_id", {
    rawVoiceId: vid,
    fallback: DEFAULT_RECALL_VOICE_ID,
  });

  return DEFAULT_RECALL_VOICE_ID;
}
