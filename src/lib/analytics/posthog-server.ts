import { PostHog } from "posthog-node";

let serverClient: PostHog | null = null;

function getPostHogServer() {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim();
  if (!key) return null;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim() || "https://app.posthog.com";
  if (!serverClient) serverClient = new PostHog(key, { host });
  return serverClient;
}

export async function trackServer(
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>,
) {
  const ph = getPostHogServer();
  if (!ph) return;
  try {
    ph.capture({ distinctId, event, properties });
  } catch {
    // ignore analytics failures
  }
}

