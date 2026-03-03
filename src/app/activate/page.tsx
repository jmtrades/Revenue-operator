import { ActivateForm } from "@/components/ActivateForm";
import { Navbar } from "@/components/sections/Navbar";

export const metadata = {
  title: "Get started free",
  description: "Set up your AI phone system in 5 minutes. No credit card required.",
};

export default function ActivatePage() {
  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      <div className="flex items-center justify-center px-4 py-12 pt-28">
        <div className="w-full max-w-lg">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8">
            <h1 className="text-2xl font-bold text-white text-center mb-1">Get started with Recall Touch</h1>
            <p className="text-zinc-400 text-center text-sm mb-8">Set up your AI phone system in 5 minutes.</p>
            <ActivateForm />
          </div>
          <p className="text-center text-zinc-500 text-xs mt-6">
            No credit card · 14-day free trial · Cancel anytime
          </p>
        </div>
      </div>
    </div>
  );
}
