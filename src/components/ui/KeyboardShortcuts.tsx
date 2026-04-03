"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Keyboard, X } from "lucide-react";

const easeOutExpo = [0.23, 1, 0.32, 1] as const;

interface ShortcutDef {
  keys: string;
  description: string;
  action: (() => void) | null;
}

export function KeyboardShortcuts() {
  const router = useRouter();
  const [showHelp, setShowHelp] = useState(false);
  const [lastKeyTime, setLastKeyTime] = useState(0);
  const [lastKeyPressed, setLastKeyPressed] = useState<string | null>(null);

  const shortcuts: ShortcutDef[] = [
    {
      keys: "g d",
      description: "Go to Dashboard",
      action: () => router.push("/app/dashboard"),
    },
    {
      keys: "g l",
      description: "Go to Leads",
      action: () => router.push("/app/leads"),
    },
    {
      keys: "g c",
      description: "Go to Campaigns",
      action: () => router.push("/app/campaigns"),
    },
    {
      keys: "g a",
      description: "Go to Agents",
      action: () => router.push("/app/agents"),
    },
    {
      keys: "g s",
      description: "Go to Settings",
      action: () => router.push("/app/settings"),
    },
    {
      keys: "?",
      description: "Toggle Shortcut Help",
      action: () => setShowHelp((prev) => !prev),
    },
    {
      keys: "Escape",
      description: "Close Help / Modal",
      action: null,
    },
  ];

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't register shortcuts when typing in inputs/textareas
      const active = document.activeElement;
      if (
        active &&
        (active.tagName === "INPUT" ||
          active.tagName === "TEXTAREA" ||
          (active as HTMLElement).isContentEditable)
      ) {
        return;
      }

      const now = Date.now();
      const key = event.key.toLowerCase();

      // Handle two-key combos (g + d/l/c/a/s)
      if (key === "g" && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
        setLastKeyPressed("g");
        setLastKeyTime(now);
        return;
      }

      // Check if this is second key of a combo
      if (
        lastKeyPressed === "g" &&
        now - lastKeyTime < 500 &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey
      ) {
        if (key === "d") {
          router.push("/app/dashboard");
          setLastKeyPressed(null);
          return;
        }
        if (key === "l") {
          router.push("/app/leads");
          setLastKeyPressed(null);
          return;
        }
        if (key === "c") {
          router.push("/app/campaigns");
          setLastKeyPressed(null);
          return;
        }
        if (key === "a") {
          router.push("/app/agents");
          setLastKeyPressed(null);
          return;
        }
        if (key === "s") {
          router.push("/app/settings");
          setLastKeyPressed(null);
          return;
        }
        setLastKeyPressed(null);
      } else {
        setLastKeyPressed(null);
      }

      // Handle single-key shortcuts
      if (key === "?" && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
        setShowHelp((prev) => !prev);
        return;
      }

      if (key === "escape") {
        if (showHelp) {
          setShowHelp(false);
          return;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router, lastKeyPressed, lastKeyTime, showHelp]);

  // Close help when Escape is pressed
  useEffect(() => {
    if (!showHelp) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowHelp(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showHelp]);

  return (
    <AnimatePresence>
      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute inset-0 bg-[var(--overlay)] backdrop-blur-[6px]"
            onClick={() => setShowHelp(false)}
            role="presentation"
            aria-hidden="true"
          />

          {/* Help Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2, ease: easeOutExpo }}
            className="relative w-full max-w-md rounded-[var(--radius-xl)] border border-[var(--border-default)] bg-[var(--bg-surface)] shadow-[var(--shadow-xl)]"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="shortcuts-title"
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-3 border-b border-[var(--border-default)] px-6 py-4 shrink-0">
              <div className="flex items-center gap-2">
                <Keyboard className="w-5 h-5 text-[var(--accent-primary)]" strokeWidth={1.75} />
                <h2
                  id="shortcuts-title"
                  className="text-[15px] font-semibold text-[var(--text-primary)] tracking-tight"
                >
                  Keyboard Shortcuts
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowHelp(false)}
                className="ml-auto -mr-1 flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-tertiary)] transition-[background-color,color] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] active:scale-[0.95] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/40"
                aria-label="Close shortcuts help"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Shortcuts Grid */}
            <div className="px-6 py-5 overflow-y-auto max-h-[calc(85vh-57px)]">
              <div className="grid grid-cols-2 gap-4">
                {shortcuts.map((shortcut) => (
                  <div
                    key={shortcut.keys}
                    className="flex flex-col gap-2 p-3 rounded-lg bg-[var(--bg-inset)]/40 border border-[var(--border-default)]"
                  >
                    <div className="flex items-center gap-1.5">
                      {shortcut.keys.split(" ").map((part, idx) => (
                        <span key={idx}>
                          <kbd className="px-2.5 py-1 rounded bg-[var(--bg-surface)] border border-[var(--border-default)] text-[11px] font-semibold text-[var(--text-primary)] shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                            {part}
                          </kbd>
                          {idx < shortcut.keys.split(" ").length - 1 && (
                            <span className="text-[var(--text-tertiary)] text-xs mx-1">+</span>
                          )}
                        </span>
                      ))}
                    </div>
                    <p className="text-[12px] text-[var(--text-secondary)] leading-snug">
                      {shortcut.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
