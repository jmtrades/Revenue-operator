"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Menu, X, ChevronDown } from "lucide-react";
import { NAV_LINKS, SOLUTIONS_LINKS, ROUTES } from "@/lib/constants";
import { Container } from "@/components/ui/Container";

export function Navbar({ initialAuthenticated = false }: { initialAuthenticated?: boolean }) {
  const t = useTranslations("siteNav");
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [authenticated, setAuthenticated] = useState(initialAuthenticated);
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

  useEffect(() => {
    let cancelled = false;

    const refreshAuthState = () => {
      fetch("/api/auth/session", {
        credentials: "include",
        cache: "no-store",
        headers: { "Cache-Control": "no-store" },
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data: { session?: { userId?: string | null } | null } | null) => {
          if (cancelled) return;
          setAuthenticated(Boolean(data?.session?.userId));
        })
        .catch(() => {
          if (!cancelled) setAuthenticated(false);
        });
    };

    refreshAuthState();
    window.addEventListener("focus", refreshAuthState);
    document.addEventListener("visibilitychange", refreshAuthState);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", refreshAuthState);
      document.removeEventListener("visibilitychange", refreshAuthState);
    };
  }, [pathname]);

  const headerStyle = {
    background: scrolled ? "rgba(10, 10, 11, 0.85)" : "transparent",
    backdropFilter: scrolled ? "blur(16px)" : "none",
    WebkitBackdropFilter: scrolled ? "blur(16px)" : "none",
    borderBottom: scrolled ? "1px solid var(--border-default)" : "none",
  };
  const desktopPrimaryHref = authenticated ? "/app/activity" : ROUTES.START;
  const desktopPrimaryLabel = authenticated ? "Dashboard →" : "Start free →";

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
          <Link
            href={ROUTES.PRODUCT}
            className="text-sm font-medium transition-colors duration-150 pb-0.5 border-b-2 border-transparent"
            style={{
              color: pathname === ROUTES.PRODUCT ? "var(--text-primary)" : "var(--text-secondary)",
              borderBottomColor: pathname === ROUTES.PRODUCT ? "var(--accent-primary)" : "transparent",
            }}
          >
            {t("product")}
          </Link>
          <div className="relative group">
            <button
              type="button"
              className="flex items-center gap-1 text-sm font-medium transition-colors duration-150 pb-0.5 border-b-2 border-transparent"
              style={{
                color: pathname.startsWith("/industries/") ? "var(--text-primary)" : "var(--text-secondary)",
                borderBottomColor: pathname.startsWith("/industries/") ? "var(--accent-primary)" : "transparent",
              }}
              aria-haspopup="true"
              aria-expanded="false"
            >
              {t("solutions")}
              <ChevronDown className="w-4 h-4 opacity-70" />
            </button>
            <div
              className="absolute top-full left-0 pt-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150"
              style={{ minWidth: "200px" }}
            >
              <div
                className="rounded-xl border py-2 shadow-lg"
                style={{
                  background: "var(--bg-surface)",
                  borderColor: "var(--border-default)",
                }}
              >
                {SOLUTIONS_LINKS.map((s) => (
                  <Link
                    key={s.href + s.labelKey}
                    href={s.href}
                    className="block px-4 py-2.5 text-sm transition-colors hover:bg-white/5"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {t(s.labelKey)}
                  </Link>
                ))}
              </div>
            </div>
          </div>
          {NAV_LINKS.filter((l) => l.href !== ROUTES.PRODUCT).map((l) => {
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
                {t(l.labelKey)}
              </Link>
            );
          })}
        </nav>
        <div className="hidden lg:flex items-center gap-3">
          {!authenticated ? (
            <Link href={ROUTES.SIGN_IN} className="btn-marketing-ghost px-4 py-2 text-sm rounded-lg no-underline">
              {t("signIn")}
            </Link>
          ) : null}
          <Link href={desktopPrimaryHref} className="btn-marketing-primary px-4 py-2 text-sm rounded-xl no-underline">
            {desktopPrimaryLabel}
          </Link>
        </div>
        <button
          type="button"
          aria-label="Toggle menu"
          aria-expanded={mobileOpen}
          className="lg:hidden p-2 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-primary)]"
          style={{ color: "var(--text-primary)" }}
          onClick={() => setMobileOpen((o) => !o)}
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </Container>

      {mobileOpen && (
        <div
          ref={menuRef}
          className="lg:hidden fixed inset-0 top-16 z-40 flex flex-col items-center justify-center gap-6 p-8 pt-12 overflow-y-auto"
          style={{
            background: "var(--bg-primary)",
            borderTop: "1px solid var(--border-default)",
          }}
        >
          <Link
            href={ROUTES.PRODUCT}
            className="text-2xl font-semibold transition-colors"
            style={{ color: "var(--text-primary)" }}
            onClick={() => setMobileOpen(false)}
          >
            {t("product")}
          </Link>
          <div className="flex flex-col items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>{t("solutions")}</p>
            {SOLUTIONS_LINKS.map((s) => (
              <Link
                key={s.href + s.labelKey}
                href={s.href}
                className="text-lg font-medium transition-colors"
                style={{ color: "var(--text-primary)" }}
                onClick={() => setMobileOpen(false)}
              >
                {t(s.labelKey)}
              </Link>
            ))}
          </div>
          {NAV_LINKS.filter((l) => l.href !== ROUTES.PRODUCT).map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-2xl font-semibold transition-colors"
              style={{ color: "var(--text-primary)" }}
              onClick={() => setMobileOpen(false)}
            >
              {t(l.labelKey)}
            </Link>
          ))}
          <div className="flex flex-col w-full max-w-xs gap-3 mt-4">
            {!authenticated ? (
              <Link href={ROUTES.SIGN_IN} className="btn-marketing-ghost w-full text-center py-3 rounded-lg no-underline text-base" onClick={() => setMobileOpen(false)}>
                {t("signIn")}
              </Link>
            ) : null}
            <Link href={desktopPrimaryHref} className="btn-marketing-primary w-full text-center py-3 rounded-xl no-underline text-base" onClick={() => setMobileOpen(false)}>
              {desktopPrimaryLabel}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
