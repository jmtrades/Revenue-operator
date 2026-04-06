"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Menu, X, ChevronDown } from "lucide-react";
import { NAV_LINKS, SOLUTIONS_LINKS, ROUTES } from "@/lib/constants";
import { Container } from "@/components/ui/Container";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export function Navbar({ initialAuthenticated = false }: { initialAuthenticated?: boolean }) {
  const t = useTranslations("siteNav");
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [authenticated, setAuthenticated] = useState(initialAuthenticated);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
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
        if (document.activeElement === first) { e.preventDefault(); last?.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  // Escape key closes mobile menu
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && mobileOpen) setMobileOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  useEffect(() => {
    setAuthenticated(initialAuthenticated);
  }, [initialAuthenticated]);

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
        .catch(() => { if (!cancelled) setAuthenticated(false); });
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

  const desktopPrimaryHref = authenticated ? ROUTES.APP_HOME : ROUTES.START;
  const desktopPrimaryLabel = authenticated ? t("dashboardCta") : t("startFreeCta");

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 h-[60px] flex items-center"
      style={{
        background: scrolled ? "var(--bg-surface-glass, rgba(255, 255, 255, 0.82))" : "transparent",
        backdropFilter: scrolled ? "saturate(180%) blur(20px)" : "none",
        WebkitBackdropFilter: scrolled ? "saturate(180%) blur(20px)" : "none",
        borderBottom: scrolled ? "1px solid var(--border-default)" : "1px solid transparent",
        boxShadow: scrolled ? "0 1px 3px rgba(0,0,0,0.04)" : "none",
        transition: "background-color 200ms cubic-bezier(0.23, 1, 0.32, 1), border-color 200ms cubic-bezier(0.23, 1, 0.32, 1), backdrop-filter 200ms cubic-bezier(0.23, 1, 0.32, 1)",
      }}
    >
      <Container className="flex items-center justify-between w-full">
        {/* Logo: clean wordmark */}
        <Link
          href="/"
          className="text-[15px] font-semibold tracking-tight no-underline"
          style={{ color: "var(--text-primary)", letterSpacing: "-0.02em" }}
        >
          Revenue Operator
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-7">
          <Link
            href={ROUTES.PRODUCT}
            className="text-[13px] font-medium transition-colors duration-150 no-underline relative pb-1 group"
            style={{
              color: pathname === ROUTES.PRODUCT ? "var(--text-primary)" : "var(--text-secondary)",
            }}
          >
            {t("product")}
            {pathname === ROUTES.PRODUCT && (
              <span
                className="absolute bottom-0 left-0 h-0.5 bg-current transition-[width] duration-200"
                style={{ width: "100%" }}
              />
            )}
            {pathname !== ROUTES.PRODUCT && (
              <span
                className="absolute bottom-0 left-0 h-0.5 bg-current transition-[width] duration-200"
                style={{ width: "0%", background: "var(--text-primary)" }}
                aria-hidden="true"
              />
            )}
          </Link>

          {/* Solutions dropdown */}
          <div className="relative group">
            <button
              type="button"
              className="flex items-center gap-1 text-[13px] font-medium transition-colors duration-150 px-2 py-1 rounded-md group-hover:bg-[var(--bg-hover)]"
              style={{
                color: pathname.startsWith("/industries/") ? "var(--text-primary)" : "var(--text-secondary)",
              }}
              aria-haspopup="true"
              aria-expanded={pathname.startsWith("/industries/") ? "true" : undefined}
            >
              {t("solutions")}
              <ChevronDown className="w-3.5 h-3.5 opacity-50" />
            </button>
            <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2.5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-[opacity,transform] duration-200 translate-y-1 group-hover:translate-y-0" style={{ minWidth: "210px" }}>
              <div
                className="rounded-xl py-1.5"
                style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-default)",
                  boxShadow: "var(--shadow-xl, 0 20px 40px rgba(0,0,0,0.1))",
                }}
              >
                {SOLUTIONS_LINKS.map((s) => (
                  <Link
                    key={s.href + s.labelKey}
                    href={s.href}
                    className="block px-4 py-2 text-[13px] no-underline transition-colors"
                    style={{ color: "var(--text-secondary)" }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "var(--text-primary)";
                      e.currentTarget.style.background = "var(--bg-hover)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "var(--text-secondary)";
                      e.currentTarget.style.background = "transparent";
                    }}
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
                className="text-[13px] font-medium transition-colors duration-150 no-underline relative pb-1 px-2 py-1 rounded-md hover:bg-[var(--bg-hover)]"
                style={{
                  color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                }}
              >
                {t(l.labelKey)}
                {isActive && (
                  <span
                    className="absolute bottom-0 left-2 h-0.5 bg-current transition-[width] duration-200"
                    style={{ width: "calc(100% - 1rem)" }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Desktop CTAs */}
        <div className="hidden lg:flex items-center gap-2.5">
          <ThemeToggle />
          {!authenticated ? (
            <Link
              href={ROUTES.SIGN_IN}
              className="text-[13px] font-medium px-3.5 py-2 rounded-lg no-underline transition-colors"
              style={{ color: "var(--text-secondary)" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text-primary)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-secondary)"; }}
            >
              {t("signIn")}
            </Link>
          ) : null}
          <Link
            href={desktopPrimaryHref}
            className="btn-marketing-blue text-[13px] px-4 py-2.5 no-underline active:scale-[0.97] transition-transform"
          >
            {desktopPrimaryLabel}
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          aria-label="Toggle menu"
          aria-expanded={mobileOpen}
          className="lg:hidden p-2.5 min-w-[44px] min-h-[44px] rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 flex items-center justify-center active:scale-[0.95] transition-transform"
          style={{ color: "var(--text-primary)" }}
          onClick={() => setMobileOpen((o) => !o)}
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </Container>

      {/* Mobile menu */}
      {mobileOpen && (
        <div
          ref={menuRef}
          className="lg:hidden fixed inset-0 top-[60px] z-40 flex flex-col p-8 pt-10 overflow-y-auto animate-slideDown"
          style={{
            background: "var(--bg-primary)",
            borderTop: "1px solid var(--border-default)",
            animation: "slideDown 300ms cubic-bezier(0.32, 0.72, 0, 1)"
          }}
        >
          <nav className="flex flex-col gap-1">
            <Link href={ROUTES.PRODUCT} className="text-base font-medium py-3 no-underline transition-colors" style={{ color: "var(--text-primary)" }} onClick={() => setMobileOpen(false)}>{t("product")}</Link>
            <div className="py-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-tertiary)" }}>{t("solutions")}</p>
              {SOLUTIONS_LINKS.map((s) => (
                <Link key={s.href + s.labelKey} href={s.href} className="block text-sm py-2 no-underline transition-colors" style={{ color: "var(--text-secondary)" }} onClick={() => setMobileOpen(false)}>{t(s.labelKey)}</Link>
              ))}
            </div>
            {NAV_LINKS.filter((l) => l.href !== ROUTES.PRODUCT).map((l) => (
              <Link key={l.href} href={l.href} className="text-base font-medium py-3 no-underline transition-colors" style={{ color: "var(--text-primary)" }} onClick={() => setMobileOpen(false)}>{t(l.labelKey)}</Link>
            ))}
          </nav>
          <div className="flex flex-col w-full gap-3 mt-8">
            {!authenticated ? (
              <Link href={ROUTES.SIGN_IN} className="btn-marketing-ghost w-full text-center py-3 rounded-[10px] no-underline text-sm" onClick={() => setMobileOpen(false)}>{t("signIn")}</Link>
            ) : null}
            <Link href={desktopPrimaryHref} className="btn-marketing-blue w-full text-center py-3 rounded-[10px] no-underline text-sm" onClick={() => setMobileOpen(false)}>{desktopPrimaryLabel}</Link>
          </div>
        </div>
      )}
    </header>
  );
}
