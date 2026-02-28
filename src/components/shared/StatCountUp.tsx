"use client";

import { useEffect, useRef, useState } from "react";

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

type StatConfig = {
  target: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
};

export function StatCountUp({ target, prefix = "", suffix = "", decimals = 0 }: StatConfig) {
  const [display, setDisplay] = useState("0");
  const ref = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || hasAnimated.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting || hasAnimated.current) return;
        hasAnimated.current = true;

        const duration = 1500;
        const start = performance.now();

        function tick(now: number) {
          const elapsed = now - start;
          const t = Math.min(elapsed / duration, 1);
          const eased = easeOutCubic(t);
          const value = target * eased;

          if (decimals === 1) {
            setDisplay(value.toFixed(1));
          } else {
            setDisplay(String(Math.round(value)));
          }

          if (t < 1) {
            requestAnimationFrame(tick);
          }
        }

        requestAnimationFrame(tick);
      },
      { threshold: 0.2, rootMargin: "0px 0px -50px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [target, decimals]);

  return (
    <span ref={ref}>
      {prefix}
      {display}
      {suffix}
    </span>
  );
}
