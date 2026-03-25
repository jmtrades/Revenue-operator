"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";

type Country = { code: string; dial: string; flag: string; pattern: RegExp };

/** Matches SUPPORTED_PHONE_COUNTRIES from @/lib/constants */
const COUNTRIES: Country[] = [
  { code: "US", dial: "+1", flag: "🇺🇸", pattern: /^\+1\d{10}$/ },
  { code: "CA", dial: "+1", flag: "🇨🇦", pattern: /^\+1\d{10}$/ },
  { code: "GB", dial: "+44", flag: "🇬🇧", pattern: /^\+44\d{10}$/ },
  { code: "AU", dial: "+61", flag: "🇦🇺", pattern: /^\+61\d{9}$/ },
  { code: "DE", dial: "+49", flag: "🇩🇪", pattern: /^\+49\d{6,14}$/ },
  { code: "FR", dial: "+33", flag: "🇫🇷", pattern: /^\+33\d{9}$/ },
  { code: "ES", dial: "+34", flag: "🇪🇸", pattern: /^\+34\d{9}$/ },
  { code: "IT", dial: "+39", flag: "🇮🇹", pattern: /^\+39\d{9,11}$/ },
  { code: "NL", dial: "+31", flag: "🇳🇱", pattern: /^\+31\d{9}$/ },
  { code: "SE", dial: "+46", flag: "🇸🇪", pattern: /^\+46\d{7,13}$/ },
  { code: "NO", dial: "+47", flag: "🇳🇴", pattern: /^\+47\d{8}$/ },
  { code: "DK", dial: "+45", flag: "🇩🇰", pattern: /^\+45\d{8}$/ },
  { code: "FI", dial: "+358", flag: "🇫🇮", pattern: /^\+358\d{6,11}$/ },
  { code: "IE", dial: "+353", flag: "🇮🇪", pattern: /^\+353\d{7,9}$/ },
  { code: "AT", dial: "+43", flag: "🇦🇹", pattern: /^\+43\d{6,13}$/ },
  { code: "CH", dial: "+41", flag: "🇨🇭", pattern: /^\+41\d{9}$/ },
  { code: "BE", dial: "+32", flag: "🇧🇪", pattern: /^\+32\d{8,9}$/ },
  { code: "PT", dial: "+351", flag: "🇵🇹", pattern: /^\+351\d{9}$/ },
  { code: "JP", dial: "+81", flag: "🇯🇵", pattern: /^\+81\d{9,10}$/ },
  { code: "BR", dial: "+55", flag: "🇧🇷", pattern: /^\+55\d{10,11}$/ },
  { code: "MX", dial: "+52", flag: "🇲🇽", pattern: /^\+52\d{10}$/ },
  { code: "IN", dial: "+91", flag: "🇮🇳", pattern: /^\+91\d{10}$/ },
  { code: "SG", dial: "+65", flag: "🇸🇬", pattern: /^\+65\d{8}$/ },
  { code: "HK", dial: "+852", flag: "🇭🇰", pattern: /^\+852\d{8}$/ },
  { code: "NZ", dial: "+64", flag: "🇳🇿", pattern: /^\+64\d{8,10}$/ },
  { code: "ZA", dial: "+27", flag: "🇿🇦", pattern: /^\+27\d{9}$/ },
  { code: "IL", dial: "+972", flag: "🇮🇱", pattern: /^\+972\d{8,9}$/ },
  { code: "PL", dial: "+48", flag: "🇵🇱", pattern: /^\+48\d{9}$/ },
  { code: "CZ", dial: "+420", flag: "🇨🇿", pattern: /^\+420\d{9}$/ },
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
  const tPhone = useTranslations("phone");
  const [country, setCountry] = useState<Country>(() => COUNTRIES[0]);
  const _numeric = useMemo(() => {
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
          placeholder={placeholder ?? tPhone("inputPlaceholder")}
          className="min-w-0 flex-1 rounded-r-xl border-0 bg-transparent px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:ring-0 focus:outline-none"
          disabled={disabled}
          aria-invalid={!isValid}
        />
      </div>
      {error && <p className="text-xs text-[var(--accent-danger)]">{error}</p>}
      {!error && displayValue && !isValid && (
        <p className="text-xs text-[var(--accent-danger)]">{tPhone("invalidNumber")}</p>
      )}
    </div>
  );
}
