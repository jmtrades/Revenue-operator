"use client";

import type { ReactNode } from "react";

/**
 * Page transition wrapper.
 *
 * Previously used framer-motion motion.div with initial: { opacity: 0 },
 * but the animation frequently failed to fire, leaving page content stuck
 * at opacity 0 (permanently invisible). Even CSS animation with fill-forward
 * was unreliable across SSR hydration boundaries.
 *
 * Now a plain pass-through wrapper. Content is always immediately visible.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
