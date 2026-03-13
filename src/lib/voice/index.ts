import { VoiceProvider, VoiceProviderConfig } from "./types";
import { VapiProvider } from "./providers/vapi";
import { ElevenLabsConversationalProvider } from "./providers/elevenlabs-conversational";

export function getVoiceProvider(config?: VoiceProviderConfig): VoiceProvider {
  const provider = (config?.provider ?? process.env.VOICE_PROVIDER ?? "elevenlabs") as VoiceProviderConfig["provider"];
  switch (provider) {
    case "elevenlabs":
      return new ElevenLabsConversationalProvider();
    case "vapi":
      return new VapiProvider();
    default:
      return new ElevenLabsConversationalProvider();
  }
}

export * from "./types";

