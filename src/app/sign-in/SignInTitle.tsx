"use client";

import { useSearchParams } from "next/navigation";

export function SignInTitle() {
  const searchParams = useSearchParams();
  const isCreate = searchParams.get("create") === "1";
  return (
    <>
      <h1 className="text-2xl font-bold text-white text-center mt-4">
        {isCreate ? "Create account" : "Sign in"}
      </h1>
      <p className="text-zinc-400 text-center text-sm">
        {isCreate ? "Get started with Recall Touch" : "Welcome back to Recall Touch"}
      </p>
    </>
  );
}
