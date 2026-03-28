"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sun, Moon } from "lucide-react";

type ThemeMode = "light" | "dark" | "system";

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeMode>("system");
  const [mounted, setMounted] = useState(false);

  // Initialize theme from DOM/cookie
  useEffect(() => {
    setMounted(true);
    const html = document.documentElement;
    const themeCookie = document.cookie
      .split("; ")
      .find((row) => row.startsWith("theme="))
      ?.split("=")[1] as ThemeMode | undefined;

    if (themeCookie) {
      setTheme(themeCookie);
    } else if (html.classList.contains("dark")) {
      setTheme("dark");
    } else if (html.classList.contains("light")) {
      setTheme("light");
    }
  }, []);

  const applyTheme = (newTheme: ThemeMode) => {
    setTheme(newTheme);
    const html = document.documentElement;
    html.classList.remove("light", "dark");

    if (newTheme === "light") {
      html.classList.add("light");
      document.cookie = "theme=light; path=/; max-age=31536000";
    } else if (newTheme === "dark") {
      html.classList.add("dark");
      document.cookie = "theme=dark; path=/; max-age=31536000";
    } else {
      // system
      document.cookie = "theme=system; path=/; max-age=31536000";
      if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        html.classList.add("dark");
      }
    }
  };

  const toggleTheme = () => {
    if (theme === "light") {
      applyTheme("dark");
    } else if (theme === "dark") {
      applyTheme("system");
    } else {
      applyTheme("light");
    }
  };

  if (!mounted) return null;

  const isDark = theme === "dark";

  return (
    <motion.button
      onClick={toggleTheme}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="p-2 rounded-lg bg-[var(--bg-hover)] hover:bg-[var(--bg-surface)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-[background-color,color,border-color] duration-[var(--duration-fast)]"
      title={`Theme: ${theme}`}
      aria-label="Toggle theme"
    >
      <motion.div
        initial={false}
        animate={{
          rotate: theme === "light" ? 0 : theme === "dark" ? 180 : 90,
        }}
        transition={{
          duration: 0.3,
          ease: "easeInOut",
        }}
      >
        {isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
      </motion.div>
    </motion.button>
  );
}
