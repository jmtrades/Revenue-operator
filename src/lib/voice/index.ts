import { VoiceProvider, VoiceProviderConfig } from "./types";
import { RecallVoiceProvider } from "./providers/recall-voice";
import { PipecatVoiceProvider } from "./providers/pipecat";
import { VoiceProviderWithFallback } from "./provider-with-fallback";
import { log } from "@/lib/logger";

function createProviderInstance(provider: string): VoiceProvider {
  switch (provider) {
    case "recall":
      return new RecallVoiceProvider();
    case "pipecat":
      return new PipecatVoiceProvider();
    case "vapi":
      log("warn", "voice.deprecated_provider", { provider: "vapi", message: "Vapi deprecated, using Recall instead" });
      return new RecallVoiceProvider();
    case "elevenlabs":
      log("warn", "voice.deprecated_provider", { provider: "elevenlabs", message: "ElevenLabs deprecated, using Recall instead" });
      return new RecallVoiceProvider();
    default:
      // Default to self-hosted Recall voice server
      return new RecallVoiceProvider();
  }
}

export function getVoiceProvider(config?: VoiceProviderConfig): VoiceProvider {
  const provider = (config?.provider ?? process.env.VOICE_PROVIDER ?? "recall") as VoiceProviderConfig["provider"];
  const primaryProvider = createProviderInstance(provider);

  // If a fallback provider is configured via env var, wrap the primary with fallback
  const fallbackProviderName = process.env.VOICE_FALLBACK_PROVIDER as VoiceProviderConfig["provider"] | undefined;
  if (fallbackProviderName) {
    const fallbackProvider = createProviderInstance(fallbackProviderName);
    log("info", "voice.init_with_fallback", { primary: provider, fallback: fallbackProviderName });
    return new VoiceProviderWithFallback(
      primaryProvider,
      fallbackProvider,
      provider,
      fallbackProviderName,
    );
  }

  return primaryProvider;
}

export * from "./types";

