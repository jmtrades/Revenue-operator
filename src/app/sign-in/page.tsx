import Link from "next/link";
import SignInForm from "./SignInForm";
import { Navbar } from "@/components/sections/Navbar";

export const metadata = {
  title: "Sign in — Recall Touch",
  description: "Sign in to your Recall Touch dashboard.",
};

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
            <h1 className="text-2xl font-bold text-white text-center mt-4">Sign in</h1>
            <p className="text-zinc-400 text-center text-sm">Welcome back to Recall Touch</p>
            <div className="h-6" />
            <SignInForm />
          </div>
          <p className="text-center text-zinc-500 text-sm mt-8">
            Don&apos;t have an account?{" "}
            <Link href="/activate" className="text-white hover:underline font-medium">
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
