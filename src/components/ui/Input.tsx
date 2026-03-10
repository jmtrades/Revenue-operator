"use client";

import type { InputHTMLAttributes } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: LucideIcon;
}

export function Input({
  label,
  error,
  helperText,
  icon: Icon,
  className,
  id,
  ...rest
}: InputProps) {
  const inputId = id || rest.name;

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-[var(--text-secondary)]"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[var(--text-tertiary)]">
            <Icon className="h-4 w-4" />
          </span>
        )}
        <input
          id={inputId}
          className={cn(
            "w-full rounded-lg border bg-[var(--bg-surface)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent-primary)] focus:outline-none focus:ring-0 disabled:opacity-60 disabled:cursor-not-allowed",
            Icon ? "pl-9 pr-3 py-2.5" : "px-3 py-2.5",
            error
              ? "border-[var(--accent-danger)]"
              : "border-[var(--border-default)] hover:border-[var(--border-hover)]",
            className,
          )}
          aria-invalid={Boolean(error)}
          {...rest}
        />
      </div>
      {error ? (
        <p className="text-xs text-[var(--accent-danger)]">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-[var(--text-tertiary)]">{helperText}</p>
      ) : null}
    </div>
  );
}

