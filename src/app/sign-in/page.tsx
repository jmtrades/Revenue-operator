"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";

/** Load form only on client so server never runs Supabase code — avoids 500 on /sign-in */
const SignInForm = dynamic(() => import("./SignInForm"), { ssr: false });

export default function SignInPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}>
        <div className="w-full max-w-md text-center space-y-6">
          <h1 className="text-xl font-semibold">Welcome back</h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>One moment…</p>
          <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
            <Link href="/" className="underline">Back to home</Link>
          </p>
        </div>
      </div>
    );
  }

  return <SignInForm />;
}
