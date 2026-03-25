"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Redirect /setup to /declare. Declaration flow lives at /declare. */
export default function SetupRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/declare");
  }, [router]);
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--background)" }}>
      <p className="text-sm" style={{ color: "var(--text-muted)" }}>Redirecting.</p>
    </div>
  );
}
