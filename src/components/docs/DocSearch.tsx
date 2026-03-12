"use client";

import { useCallback, useEffect, useState } from "react";
import { Search } from "lucide-react";

interface DocSearchProps {
  onSearch: (query: string) => void;
  placeholder?: string;
}

export function DocSearch({ onSearch, placeholder = "Search docs…" }: DocSearchProps) {
  const [value, setValue] = useState("");

  const debounced = useCallback(
    (q: string) => {
      const t = setTimeout(() => onSearch(q), 150);
      return () => clearTimeout(t);
    },
    [onSearch]
  );

  useEffect(() => {
    return debounced(value);
  }, [value, debounced]);

  return (
    <div className="relative">
      <Search
        className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500"
        aria-hidden
      />
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-4 py-2 rounded-xl border border-zinc-800 bg-zinc-900/50 text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-600 focus:border-zinc-600 text-sm"
        aria-label="Search documentation"
      />
    </div>
  );
}
