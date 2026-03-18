import { VoiceProvider, VoiceProviderConfig } from "./types";
import { VapiProvider } from "./providers/vapi";
import { ElevenLabsConversationalProvider } from "./providers/elevenlabs-conversational";
import { RecallVoiceProvider } from "./providers/recall-voice";

export function getVoiceProvider(config?: VoiceProviderConfig): VoiceProvider {
  const provider = (config?.provider ?? process.env.VOICE_PROVIDER ?? "recall") as VoiceProviderConfig["provider"];
  switch (provider) {
    case "recall":
      return new RecallVoiceProvider();
    case "elevenlabs":
      return new ElevenLabsConversationalProvider();
    case "vapi":
      return new VapiProvider();
    default:
      // Default to self-hosted Recall voice server
      return new RecallVoiceProvider();
  }
}

export * from "./types";

