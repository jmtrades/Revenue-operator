"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/cn";

type Country = { code: string; dial: string; flag: string; pattern: RegExp };

const COUNTRIES: Country[] = [
  { code: "US", dial: "+1", flag: "🇺🇸", pattern: /^\+1\d{10}$/ },
  { code: "CA", dial: "+1", flag: "🇨🇦", pattern: /^\+1\d{10}$/ },
  { code: "GB", dial: "+44", flag: "🇬🇧", pattern: /^\+44\d{10}$/ },
  { code: "MX", dial: "+52", flag: "🇲🇽", pattern: /^\+52\d{10}$/ },
  { code: "BR", dial: "+55", flag: "🇧🇷", pattern: /^\+55\d{10,11}$/ },
  { code: "AU", dial: "+61", flag: "🇦🇺", pattern: /^\+61\d{9}$/ },
  { code: "DE", dial: "+49", flag: "🇩🇪", pattern: /^\+49\d{6,14}$/ },
  { code: "FR", dial: "+33", flag: "🇫🇷", pattern: /^\+33\d{9}$/ },
  { code: "ES", dial: "+34", flag: "🇪🇸", pattern: /^\+34\d{9}$/ },
  { code: "JP", dial: "+81", flag: "🇯🇵", pattern: /^\+81\d{9,10}$/ },
];

export function PhoneInput({
  value,
  onChange,
  placeholder,
  className,
  label,
  error,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
}) {
  const [country, setCountry] = useState<Country>(() => COUNTRIES[0]);
  const numeric = useMemo(() => {
    const digits = value.replace(/\D/g, "");
    if (value.startsWith("+")) return value;
    return country.dial + digits;
  }, [value, country.dial]);

  const displayValue = value.startsWith("+") ? value : (value ? country.dial + value.replace(/\D/g, "") : "");

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, "");
    const withDial = country.dial + raw;
    onChange(withDial);
  }

  function handleCountryChange(c: Country) {
    setCountry(c);
    const raw = value.replace(/\D/g, "").replace(country.dial.replace("+", ""), "");
    onChange(c.dial + raw);
  }

  const isValid = !displayValue || country.pattern.test(displayValue);

  return (
    <div className={cn("space-y-1", className)}>
      {label && (
        <label className="block text-sm font-medium text-[var(--text-primary)]">
          {label}
        </label>
      )}
      <div className="flex rounded-xl border border-[var(--border-default)] bg-[var(--bg-input)] focus-within:border-[var(--accent-primary)] focus-within:ring-1 focus-within:ring-[var(--accent-primary)]">
        <select
          value={country.code}
          onChange={(e) => {
            const c = COUNTRIES.find((x) => x.code === e.target.value);
            if (c) handleCountryChange(c);
          }}
          className="rounded-l-xl border-0 bg-transparent px-3 py-2.5 text-sm text-[var(--text-primary)] focus:ring-0"
          disabled={disabled}
          aria-label="Country"
        >
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.flag} {c.dial}
            </option>
          ))}
        </select>
        <input
          type="tel"
          value={displayValue}
          onChange={handleInput}
          placeholder={placeholder ?? "Phone number"}
          className="min-w-0 flex-1 rounded-r-xl border-0 bg-transparent px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:ring-0 focus:outline-none"
          disabled={disabled}
          aria-invalid={!isValid}
        />
      </div>
      {error && <p className="text-xs text-[var(--accent-danger)]">{error}</p>}
      {!error && displayValue && !isValid && (
        <p className="text-xs text-[var(--accent-danger)]">Invalid number for selected country</p>
      )}
    </div>
  );
}
