import posthogJs from "posthog-js";

export function initPostHogClient() {
  if (typeof window === "undefined") return;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim();
  if (!key) return;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim() || "https://app.posthog.com";

  const ph = posthogJs as typeof posthogJs & { __loaded?: boolean };
  if (ph.__loaded) return;
  posthogJs.init(key, {
    api_host: host,
    capture_pageview: false,
    capture_pageleave: true,
    autocapture: false,
  });
  ph.__loaded = true;
}

export function track(event: string, properties?: Record<string, unknown>) {
  try {
    if (typeof window === "undefined") return;
    initPostHogClient();
    posthogJs.capture(event, properties);
  } catch {
    // ignore analytics failures
  }
}

