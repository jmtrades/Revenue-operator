"use client";

import Link from "next/link";

/**
 * Single primary CTA style. Doctrine: one primary action per view when possible.
 */

interface PrimaryActionProps {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  className?: string;
}

export function PrimaryAction({
  children,
  href,
  onClick,
  type = "button",
  className = "",
}: PrimaryActionProps) {
  const style = {
    background: "var(--meaning-green)",
    color: "#0E1116",
  };
  const base = "inline-block px-5 py-2.5 rounded-lg font-medium transition-opacity duration-150 hover:opacity-90 focus-ring";

  if (href) {
    return (
      <Link href={href} className={`${base} ${className}`} style={style}>
        {children}
      </Link>
    );
  }
  return (
    <button
      type={type}
      onClick={onClick}
      className={`${base} ${className}`}
      style={style}
    >
      {children}
    </button>
  );
}
