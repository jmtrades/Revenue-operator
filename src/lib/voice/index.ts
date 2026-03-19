import { VoiceProvider, VoiceProviderConfig } from "./types";
import { RecallVoiceProvider } from "./providers/recall-voice";
import { PipecatVoiceProvider } from "./providers/pipecat";
import { VoiceProviderWithFallback } from "./provider-with-fallback";

function createProviderInstance(provider: string): VoiceProvider {
  switch (provider) {
    case "recall":
      return new RecallVoiceProvider();
    case "pipecat":
      return new PipecatVoiceProvider();
    case "vapi":
      console.warn(
        "[voice] Vapi provider is deprecated. Using Recall voice server instead. Please update your configuration to use 'recall' as the VOICE_PROVIDER."
      );
      return new RecallVoiceProvider();
    case "elevenlabs":
      console.warn(
        "[voice] ElevenLabs provider is deprecated. Using Recall voice server instead. Please update your configuration to use 'recall' as the VOICE_PROVIDER."
      );
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
    console.info(
      `[voice] Initializing voice provider with fallback: ${provider} (primary) -> ${fallbackProviderName} (fallback)`
    );
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

