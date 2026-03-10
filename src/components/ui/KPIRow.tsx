"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface KPIRowProps {
  children: ReactNode;
  className?: string;
}

export function KPIRow({ children, className }: KPIRowProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4",
        className,
      )}
    >
      {children}
    </div>
  );
}

