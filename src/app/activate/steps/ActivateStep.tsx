"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Confetti } from "@/components/Confetti";

export function ActivateStep({
  onFinalize,
  goBack,
}: {
  onFinalize: (e?: React.MouseEvent) => void;
  goBack: () => void;
}) {
  const [carrier, setCarrier] = useState<"att" | "verizon" | "tmobile" | "other">("att");

  let code: string;
  if (carrier === "att") code = "*21*[your Recall Touch number]#";
  else if (carrier === "verizon") code = "*72[your Recall Touch number]";
  else if (carrier === "tmobile") code = "**21*[your Recall Touch number]#";
  else code = "Set conditional call forwarding to your Recall Touch number.";

  return (
    <div className="space-y-6">
      <Confetti key="step5-confetti" />
      <div>
        <h2 className="text-lg md:text-xl font-semibold text-slate-50">
          <span className="inline-flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-400" />
            Your AI agent is live!
          </span>
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Your agent is ready to take calls. Complete the steps below to start.
        </p>
      </div>

      <ul className="space-y-2 rounded-xl border border-slate-700 bg-slate-900/40 px-4 py-3 text-sm text-slate-300">
        <li className="flex items-center gap-2"><span className="text-emerald-400">✓</span> Business name set</li>
        <li className="flex items-center gap-2"><span className="text-emerald-400">✓</span> Phone number added</li>
        <li className="flex items-center gap-2"><span className="text-emerald-400">✓</span> Agent template chosen</li>
        <li className="flex items-center gap-2"><span className="text-emerald-400">✓</span> Greeting configured</li>
        <li className="flex items-center gap-2"><span className="text-emerald-400">✓</span> Ready to forward calls</li>
      </ul>

      <div className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
        <span className="h-2 w-2 rounded-full bg-emerald-400" />
        <span>Agent active · Calls will be answered 24/7.</span>
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/50 px-4 py-4 space-y-3">
          <p className="text-sm font-medium text-slate-100">Forward your business number</p>
          <p className="text-xs text-slate-400">
            Point your existing line at your agent. You can change this any time.
          </p>
          <div className="space-y-3">
            <label className="block text-xs font-medium text-slate-300">Carrier</label>
            <div className="flex flex-wrap gap-2 text-[11px]">
              {[
                { id: "att", label: "AT&T" },
                { id: "verizon", label: "Verizon" },
                { id: "tmobile", label: "T-Mobile" },
                { id: "other", label: "Other" },
              ].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCarrier(c.id as "att" | "verizon" | "tmobile" | "other")}
                  className={`rounded-full border px-3 py-1 ${
                    carrier === c.id
                      ? "border-sky-400 bg-sky-500/10 text-slate-50"
                      : "border-slate-700 bg-slate-900/40 text-slate-300 hover:border-slate-500"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-[11px] text-slate-300">
              <p className="font-medium mb-1">Forwarding code</p>
              <p className="font-mono text-xs">{code}</p>
              <p className="mt-1 text-[10px] text-slate-500">
                Dial this from your business phone, then press call. We&apos;ll detect the first forwarded call automatically.
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/50 px-4 py-4 space-y-3">
          <p className="text-sm font-medium text-slate-100">Use a Recall Touch number instead</p>
          <p className="text-xs text-slate-400">
            Ideal for tracking or departments. We&apos;ll auto-route calls to your agent.
          </p>
          <button
            type="button"
            onClick={() => onFinalize()}
            className="inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-2 text-xs font-medium text-slate-200 hover:border-slate-500"
          >
            Generate a dedicated number
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 pt-3">
        <button type="button" onClick={goBack} className="text-xs md:text-sm text-slate-400 hover:text-slate-100">
          ← Back
        </button>
        <button
          type="button"
          onClick={(e) => void onFinalize(e)}
          className="inline-flex items-center justify-center rounded-xl bg-emerald-500 px-5 py-2.5 text-xs md:text-sm font-semibold text-white hover:bg-emerald-400"
        >
          Activate Agent →
        </button>
      </div>
    </div>
  );
}
