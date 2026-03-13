import { VoiceProvider, VoiceProviderConfig } from "./types";
import { VapiProvider } from "./providers/vapi";

export function getVoiceProvider(config?: VoiceProviderConfig): VoiceProvider {
  const provider = (config?.provider ?? process.env.VOICE_PROVIDER ?? "vapi") as VoiceProviderConfig["provider"];
  switch (provider) {
    case "vapi":
      return new VapiProvider();
    default:
      return new VapiProvider();
  }
}

export * from "./types";

