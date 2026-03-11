"use client";

import { useState } from "react";
import Link from "next/link";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { ArrowLeft, Upload } from "lucide-react";

export default function PhonePortPage() {
  const [step, setStep] = useState(1);
  const [number, setNumber] = useState("");
  const [carrier, setCarrier] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Breadcrumbs
        items={[
          { label: "Settings", href: "/app/settings" },
          { label: "Phone & numbers", href: "/app/settings/phone" },
          { label: "Port number" },
        ]}
      />
      <Link
        href="/app/settings/phone"
        className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Phone
      </Link>
      <h1 className="text-xl font-semibold text-white mb-1">Port your existing number</h1>
      <p className="text-sm text-zinc-400 mb-8">
        Bring your current business number to Recall Touch. We’ll guide you through the steps and notify you when the port is complete.
      </p>

      {submitted ? (
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6 text-center">
          <p className="text-white font-medium mb-1">Request received</p>
          <p className="text-sm text-zinc-400 mb-4">
            Our team will review your port request and email you with next steps and an estimated timeline.
          </p>
          <Link href="/app/settings/phone" className="text-sm font-medium text-[var(--accent-primary)] hover:underline">
            Back to Phone settings
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {step >= 1 && (
            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6">
              <p className="text-sm font-medium text-white mb-2">Step 1 — Number and carrier</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Phone number to port</label>
                  <input
                    type="tel"
                    value={number}
                    onChange={(e) => setNumber(e.target.value)}
                    placeholder="+1 (555) 123-4567"
                    className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-white placeholder:text-zinc-500 text-sm focus:border-[var(--accent-primary)] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Current carrier</label>
                  <input
                    type="text"
                    value={carrier}
                    onChange={(e) => setCarrier(e.target.value)}
                    placeholder="e.g. AT&T, Verizon"
                    className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-white placeholder:text-zinc-500 text-sm focus:border-[var(--accent-primary)] focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}
          {step >= 2 && (
            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6">
              <p className="text-sm font-medium text-white mb-2">Step 2 — Letter of Authorization (LOA)</p>
              <p className="text-xs text-zinc-500 mb-4">Upload a signed LOA from your current carrier. Required for porting.</p>
              <div className="border border-dashed border-[var(--border-default)] rounded-xl p-8 text-center">
                <Upload className="w-8 h-8 text-zinc-500 mx-auto mb-2" />
                <p className="text-sm text-zinc-400">Drag and drop or click to upload</p>
                <p className="text-xs text-zinc-500 mt-1">PDF, JPG, or PNG</p>
              </div>
            </div>
          )}
          {step >= 3 && (
            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6">
              <p className="text-sm font-medium text-white mb-2">Step 3 — Account details</p>
              <p className="text-xs text-zinc-500 mb-4">Account number and PIN from your current carrier (if applicable).</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Account number</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-white text-sm focus:border-[var(--accent-primary)] focus:outline-none"
                    placeholder="From your carrier bill"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">PIN / Passcode</label>
                  <input
                    type="password"
                    className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-white text-sm focus:border-[var(--accent-primary)] focus:outline-none"
                    placeholder="If required by carrier"
                  />
                </div>
              </div>
            </div>
          )}
          <div className="flex items-center justify-between">
            {step > 1 ? (
              <button type="button" onClick={() => setStep((s) => s - 1)} className="text-sm text-zinc-400 hover:text-white">
                Back
              </button>
            ) : (
              <span />
            )}
            {step < 3 ? (
              <button type="button" onClick={() => setStep((s) => s + 1)} className="px-4 py-2 rounded-xl bg-white text-black font-medium text-sm hover:bg-zinc-100">
                Next
              </button>
            ) : (
              <button type="submit" className="px-4 py-2 rounded-xl bg-white text-black font-medium text-sm hover:bg-zinc-100">
                Submit port request
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
