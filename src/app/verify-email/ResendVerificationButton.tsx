"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function ResendVerificationButton({ email }: { email: string }) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<"idle" | "sent" | "error">("idle");

  const trimmed = useMemo(() => email.trim(), [email]);

  return (
    <button
      type="button"
      onClick={async () => {
        if (!trimmed) return;
        setBusy(true);
        setStatus("idle");
        try {
          const supabase = createClient();
          const { error } = await supabase.auth.resend({
            type: "signup",
            email: trimmed,
          });
          if (error) {
            setStatus("error");
            return;
          }
          setStatus("sent");
        } catch {
          setStatus("error");
        } finally {
          setBusy(false);
        }
      }}
      className="inline-flex items-center justify-center gap-2 rounded-xl bg-white text-black font-semibold px-6 py-3 hover:bg-zinc-100 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      disabled={busy || !trimmed}
      aria-label="Resend verification email"
    >
      {busy ? "Resending…" : "Resend"}
      {status === "sent" ? <span className="text-sm" style={{ color: "var(--text-tertiary)" }}>Sent</span> : null}
      {status === "error" ? <span className="text-sm" style={{ color: "var(--text-tertiary)" }}>Try again</span> : null}
    </button>
  );
}

