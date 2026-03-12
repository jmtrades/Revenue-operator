"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

interface DocCodeBlockProps {
  code: string;
  language?: "bash" | "json" | "javascript" | "python" | "text";
  title?: string;
}

export function DocCodeBlock({ code, language = "text", title }: DocCodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900/80 my-4">
      {(title || language) && (
        <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800 bg-zinc-900/50">
          {title && (
            <span className="text-xs font-medium text-zinc-400">{title}</span>
          )}
          <span className="text-xs text-zinc-500 uppercase">{language}</span>
        </div>
      )}
      <pre
        className="p-4 overflow-x-auto text-sm font-mono text-zinc-300 leading-relaxed"
        data-language={language}
      >
        <code>{code}</code>
      </pre>
      <button
        type="button"
        onClick={copyToClipboard}
        className="absolute top-2 right-2 p-2 rounded-lg bg-zinc-800/80 text-zinc-400 hover:text-white hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-white/20 transition-colors"
        aria-label="Copy code"
      >
        {copied ? (
          <Check className="h-4 w-4 text-emerald-400" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}
