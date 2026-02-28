"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { NAV_LINKS, ROUTES } from "@/lib/constants";
import { Container } from "@/components/ui/Container";

export function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileOpen || !menuRef.current) return;
    const focusables = menuRef.current.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled])'
    );
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    first?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  const headerStyle = {
    background: scrolled ? "rgba(10, 10, 11, 0.85)" : "transparent",
    backdropFilter: scrolled ? "blur(16px)" : "none",
    WebkitBackdropFilter: scrolled ? "blur(16px)" : "none",
    borderBottom: scrolled ? "1px solid var(--border-default)" : "none",
  };

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 h-16 flex items-center transition-all duration-200"
      style={headerStyle}
    >
      <Container className="flex items-center justify-between w-full">
        <Link
          href="/"
          className="text-[17px] font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          Recall Touch
        </Link>
        <nav className="hidden lg:flex items-center gap-8">
          {NAV_LINKS.map((l) => {
            const isActive = pathname === l.href || (l.href.length > 1 && pathname.startsWith(l.href + "/"));
            return (
              <Link
                key={l.href}
                href={l.href}
                className="text-sm font-medium transition-colors duration-150 pb-0.5 border-b-2 border-transparent"
                style={{
                  color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                  borderBottomColor: isActive ? "var(--accent-primary)" : "transparent",
                }}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="hidden lg:flex items-center gap-3">
          <Link href={ROUTES.SIGN_IN} className="btn-marketing-ghost px-4 py-2 text-sm rounded-lg no-underline">
            Sign in
          </Link>
          <Link href={ROUTES.START} className="btn-marketing-primary px-4 py-2 text-sm rounded-lg no-underline">
            Start free →
          </Link>
        </div>
        <button
          type="button"
          aria-label="Toggle menu"
          aria-expanded={mobileOpen}
          className="lg:hidden p-2 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-primary)]"
          style={{ color: "var(--text-primary)" }}
          onClick={() => setMobileOpen((o) => !o)}
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </Container>

      {mobileOpen && (
        <div
          ref={menuRef}
          className="lg:hidden fixed inset-0 top-16 z-40 flex flex-col items-center justify-center gap-8 p-8 pt-12"
          style={{
            background: "var(--bg-primary)",
            borderTop: "1px solid var(--border-default)",
          }}
        >
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-2xl font-semibold transition-colors"
              style={{ color: "var(--text-primary)" }}
              onClick={() => setMobileOpen(false)}
            >
              {l.label}
            </Link>
          ))}
          <div className="flex flex-col w-full max-w-xs gap-3 mt-4">
            <Link href={ROUTES.SIGN_IN} className="btn-marketing-ghost w-full text-center py-3 rounded-lg no-underline text-base" onClick={() => setMobileOpen(false)}>
              Sign in
            </Link>
            <Link href={ROUTES.START} className="btn-marketing-primary w-full text-center py-3 rounded-lg no-underline text-base" onClick={() => setMobileOpen(false)}>
              Start free →
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
