import Link from "next/link";
import { ActivateForm } from "@/components/ActivateForm";

export const metadata = {
  title: "Get started free",
  description: "Set up your AI phone system in 5 minutes. No credit card required.",
};

export default function ActivatePage() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <Link href="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <span className="text-black font-bold text-sm">RT</span>
          </div>
          <span className="text-white font-semibold text-lg">Recall Touch</span>
        </Link>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8">
          <h1 className="text-2xl font-bold text-white text-center mb-1">Get started free</h1>
          <p className="text-zinc-400 text-center text-sm mb-8">Set up your AI phone system in 5 minutes.</p>
          <ActivateForm />
        </div>
        <p className="text-center text-zinc-600 text-xs mt-6">
          No credit card · 14-day free trial · Cancel anytime
        </p>
        <p className="text-center text-zinc-500 text-sm mt-4">
          Already have an account?{" "}
          <Link href="/sign-in" className="text-white hover:underline">
            Sign in →
          </Link>
        </p>
      </div>
    </div>
  );
}
