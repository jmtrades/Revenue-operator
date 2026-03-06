"use client";

import { Suspense } from "react";
import SignInForm from "./SignInForm";

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#080d19]" />}>
      <SignInForm />
    </Suspense>
  );
}
