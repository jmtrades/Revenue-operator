"use client";

import { useEffect, useState } from "react";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4"];
const COUNT = 60;
const DURATION_MS = 3000;

export function Confetti() {
  const [pieces, setPieces] = useState<Array<{ id: number; left: number; delay: number; color: string; size: number; duration: number; dx: number }>>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const next = Array.from({ length: COUNT }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 400,
      color: COLORS[Math.floor(Math.random() * COLORS.length)]!,
      size: 6 + Math.random() * 8,
      duration: 2 + Math.random() * 1.5,
      dx: (Math.random() - 0.5) * 120,
    }));
    setPieces(next);
    const t = setTimeout(() => setPieces([]), DURATION_MS);
    return () => clearTimeout(t);
  }, []);

  if (!mounted || pieces.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden" aria-hidden>
      {pieces.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-sm animate-confetti-fall"
          style={{
            left: `${p.left}vw`,
            top: "-20px",
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            animationDelay: `${p.delay}ms`,
            animationDuration: `${p.duration}s`,
            ["--confetti-dx" as string]: `${p.dx}px`,
          }}
        />
      ))}
    </div>
  );
}
