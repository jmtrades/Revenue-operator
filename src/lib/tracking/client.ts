// Lightweight analytics tracker for Revenue Operator
// Sends events to /api/admin/track

const TRACK_ENDPOINT = "/api/admin/track";

let sessionId: string | null = null;

function getSessionId(): string {
  if (sessionId) return sessionId;
  sessionId = `s_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  return sessionId;
}

function getUtmParams(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.search);
  const utm: Record<string, string> = {};
  for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"]) {
    const val = params.get(key);
    if (val) utm[key] = val;
  }
  return utm;
}

function getDeviceType(): string {
  if (typeof window === "undefined") return "unknown";
  const w = window.innerWidth;
  if (w < 768) return "mobile";
  if (w < 1024) return "tablet";
  return "desktop";
}

export function track(eventName: string, properties?: Record<string, unknown>, category?: string) {
  if (typeof window === "undefined") return;

  const utm = getUtmParams();
  const payload = {
    event_name: eventName,
    event_category: category || "interaction",
    page_url: window.location.href,
    referrer: document.referrer || undefined,
    session_id: getSessionId(),
    device_type: getDeviceType(),
    browser: navigator.userAgent.slice(0, 100),
    properties: properties || {},
    ...utm,
  };

  // Use sendBeacon for reliability, fall back to fetch
  const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
  if (navigator.sendBeacon) {
    navigator.sendBeacon(TRACK_ENDPOINT, blob);
  } else {
    fetch(TRACK_ENDPOINT, { method: "POST", body: blob, keepalive: true }).catch((e: unknown) => {
      console.warn("[Analytics] fetch failed:", e instanceof Error ? e.message : String(e));
    });
  }
}

// Convenience methods
export const trackPageView = (page?: string) => track("page_view", { page: page || window.location.pathname }, "page");
export const trackSignupStart = () => track("signup_start", {}, "funnel");
export const trackSignupComplete = (props?: Record<string, unknown>) => track("signup_complete", props, "funnel");
export const trackOnboardingStep = (step: string, stepOrder: number) => track("onboarding_step", { step, step_order: stepOrder }, "funnel");
export const trackOnboardingComplete = () => track("onboarding_complete", {}, "funnel");
export const trackFirstCall = () => track("first_call", {}, "funnel");
export const trackFeatureUsed = (feature: string, action?: string) => track("feature_used", { feature, action }, "feature");
export const trackCTAClick = (ctaName: string, location?: string) => track("cta_click", { cta: ctaName, location }, "conversion");
export const trackPricingView = (plan?: string) => track("pricing_view", { plan }, "conversion");
export const trackCheckoutStart = (plan: string) => track("checkout_start", { plan }, "conversion");
export const trackError = (error: string, context?: string) => track("error", { error, context }, "system");
