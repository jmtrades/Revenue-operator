"use client";

import Link from "next/link";
import SignInForm from "./SignInForm";
import { SignInTitle } from "./SignInTitle";
import { Navbar } from "@/components/sections/Navbar";

/**
 * Sign-in page is fully client-rendered to avoid 503 when RSC prefetch runs
 * (e.g. when SESSION_SECRET or other server deps are missing in some envs).
 */
export default function SignInPage() {
  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      <div className="flex items-center justify-center px-4 py-12 pt-28">
        <div className="w-full max-w-md mx-auto mt-16">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8">
            <div className="flex justify-center">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                <span className="text-black font-bold text-sm">RT</span>
              </div>
            </div>
            <SignInTitle />
            <div className="h-6" />
            <SignInForm />
          </div>
          <p className="text-center text-zinc-500 text-sm mt-8">
            Don&apos;t have an account?{" "}
            <Link href="/activate" className="text-white hover:underline font-medium">
              Start free
            </Link>
            {" or "}
            <Link href="/sign-in?create=1" className="text-white hover:underline font-medium">
              Create account →
            </Link>
          </p>
          <p className="text-center text-zinc-600 text-xs mt-4">
            <Link href="/" className="hover:underline">Back to home</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
