"use client";

import { useEffect, useState } from "react";

/**
 * Calm reinforcement when first win (first call handled, first lead processed, first commitment).
 * Fades after 3 seconds. No confetti. No celebration animation.
 */
export function FirstWinBanner({ show, message, onDone }: { show: boolean; message: string; onDone?: () => void }) {
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (!show || !message) return;
    setVisible(true);
    setFading(false);
    const fadeAt = setTimeout(() => setFading(true), 3000);
    const hideAt = setTimeout(() => {
      setVisible(false);
      onDone?.();
    }, 3400);
    return () => {
      clearTimeout(fadeAt);
      clearTimeout(hideAt);
    };
  }, [show, message, onDone]);

  if (!visible) return null;

  return (
    <p
      className="text-lg transition-opacity duration-300"
      style={{ color: "var(--text-primary)", opacity: fading ? 0 : 1 }}
    >
      {message}
    </p>
  );
}
