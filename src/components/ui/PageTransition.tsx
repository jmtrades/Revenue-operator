"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { pageTransition } from "@/lib/animations";

export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div {...pageTransition}>
      {children}
    </motion.div>
  );
}
