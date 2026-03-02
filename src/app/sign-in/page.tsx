import Link from "next/link";
import SignInForm from "./SignInForm";

export const metadata = {
  title: "Sign in",
  description: "Sign in to your Recall Touch dashboard.",
};

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <span className="text-black font-bold text-sm">RT</span>
          </div>
          <span className="text-white font-semibold text-lg">Recall Touch</span>
        </Link>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8">
          <h1 className="text-2xl font-bold text-white text-center mb-1">Welcome back</h1>
          <p className="text-zinc-400 text-center text-sm mb-8">Sign in to your dashboard.</p>
          <SignInForm />
        </div>
        <p className="text-center text-zinc-500 text-sm mt-6">
          Don&apos;t have an account?{" "}
          <Link href="/activate" className="text-white hover:underline">
            Start free →
          </Link>
        </p>
        <p className="text-center text-zinc-600 text-xs mt-4">
          <Link href="/" className="hover:underline">
            Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
