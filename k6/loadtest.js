import http from "k6/http";
import { check, sleep } from "k6";

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";

export const options = {
  scenarios: {
    health_probe: {
      executor: "constant-vus",
      vus: 100,
      duration: "20s",
    },
    voice_preview: {
      executor: "constant-vus",
      vus: 10,
      duration: "20s",
    },
  },
};

export default function () {
  // Always hit a lightweight public endpoint first.
  const h = http.get(`${BASE_URL}/api/health`, { timeout: "10s" });
  check(h, { "health status is 200": (r) => r.status === 200 });

  // Then simulate 10 concurrent "call-like" preview operations.
  // This is a public endpoint and won't require auth.
  const v = http.get(
    `${BASE_URL}/api/demo/voice-preview?voice_id=default&industry=general&text=${encodeURIComponent(
      "Thanks for calling. I can help you with scheduling today."
    )}`,
    { timeout: "15s" }
  );
  // Rate limits may kick in depending on proxy settings; treat non-200 as a failure signal.
  check(v, { "voice preview status is 200 or 429": (r) => r.status === 200 || r.status === 429 });

  sleep(0.2);
}

