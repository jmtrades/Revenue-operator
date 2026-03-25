"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useTranslations } from "next-intl";
import SignInForm from "./SignInForm";

export default function SignInPage() {
  const t = useTranslations("auth.signIn");
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--bg-base)]" />}>
      <div>
        <Link href="/" className="sr-only">
          {t("backToHome")}
        </Link>
        <SignInForm />
      </div>
    </Suspense>
  );
}
