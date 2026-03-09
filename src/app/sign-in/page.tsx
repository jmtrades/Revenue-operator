"use client";

import Link from "next/link";
import { Suspense } from "react";
import SignInForm from "./SignInForm";

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--bg-base)]" />}>
      <div>
        <Link href="/" className="sr-only">
          Back to home
        </Link>
        <SignInForm />
      </div>
    </Suspense>
  );
}
