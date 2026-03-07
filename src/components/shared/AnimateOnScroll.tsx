"use client";

import { type ReactNode } from "react";
import { motion } from "framer-motion";

// Visible by default (opacity: 1) so sections render without JS; only animate translate when in view
const fadeUp = {
  initial: { opacity: 1, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: "easeOut" as const },
  viewport: { once: true, margin: "-50px" },
};

export function AnimateOnScroll({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <motion.div {...fadeUp} className={className}>
      {children}
    </motion.div>
  );
}

export function StaggerChildren({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-50px" }}
      variants={{
        visible: { transition: { staggerChildren: 0.1 } },
        hidden: {},
      }}
    >
      {children}
    </motion.div>
  );
}

export const fadeUpVariants = {
  hidden: { opacity: 1, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};
