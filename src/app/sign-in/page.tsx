import Link from "next/link";
import SignInForm from "./SignInForm";
import { Navbar } from "@/components/sections/Navbar";

export const metadata = {
  title: "Sign in",
  description: "Sign in to your Recall Touch dashboard.",
};

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      <div className="flex items-center justify-center px-4 py-12 pt-28">
        <div className="w-full max-w-md">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8">
            <h1 className="text-2xl font-bold text-white text-center mb-1">Sign in</h1>
            <p className="text-zinc-400 text-center text-sm mb-8">Welcome back to Recall Touch</p>
            <SignInForm />
          </div>
          <p className="text-center text-zinc-500 text-sm mt-6">
            Don&apos;t have an account?{" "}
            <Link href="/activate" className="text-white hover:underline">
              Start free →
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
