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
    <div className="relative group rounded-xl overflow-hidden border border-[var(--border-default)] bg-[var(--bg-card)]/80 my-4">
      {(title || language) && (
        <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border-default)] bg-[var(--bg-card)]/50">
          {title && (
            <span className="text-xs font-medium text-[var(--text-tertiary)]">{title}</span>
          )}
          <span className="text-xs text-[var(--text-tertiary)] uppercase">{language}</span>
        </div>
      )}
      <pre
        className="p-4 overflow-x-auto text-sm font-mono text-[var(--text-secondary)] leading-relaxed"
        data-language={language}
      >
        <code>{code}</code>
      </pre>
      <button
        type="button"
        onClick={copyToClipboard}
        className="absolute top-2 right-2 p-2 rounded-lg bg-[var(--bg-inset)]/80 text-[var(--text-tertiary)] hover:text-white hover:bg-[var(--bg-inset)] focus:outline-none focus:ring-2 focus:ring-white/20 transition-colors"
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
