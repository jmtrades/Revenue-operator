"use client";

import Link from "next/link";

/**
 * Quiet secondary action. Border, no fill.
 */

interface SecondaryActionProps {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  className?: string;
}

export function SecondaryAction({
  children,
  href,
  onClick,
  type = "button",
  className = "",
}: SecondaryActionProps) {
  const style = {
    background: "var(--card)",
    border: "1px solid var(--border)",
    color: "var(--text-primary)",
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
