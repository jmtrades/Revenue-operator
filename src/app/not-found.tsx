import Link from "next/link";
import { ROUTES } from "@/lib/constants";

export const metadata = {
  title: "Page not found",
  robots: { index: false },
};

/**
 * Phase 91 — editorial-light 404 page. Was a dark-themed orphan in an
 * otherwise editorial-light marketing surface. Now matches Phase 81 type
 * + colour tokens so a lost user lands in the brand, not in a separate
 * design language. Surfaces escape hatches in priority order:
 * (1) homepage — most lost users were trying to learn about the
 * product, (2) the app — already-paying users who hit a stale link,
 * (3) /safety, /pricing, /trust as text links for the high-intent
 * minority that landed on a deep page.
 */
export default function NotFound() {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        background: "var(--bg-primary)",
        color: "var(--text-primary)",
      }}
    >
      <div className="w-full max-w-lg text-center">
        <p
          className="eyebrow-editorial mb-5"
          style={{ color: "var(--accent-primary)" }}
        >
          404
        </p>
        <h1
          className="font-editorial mb-5"
          style={{
            fontSize: "clamp(2.25rem, 4.5vw, 3.5rem)",
            color: "var(--text-primary)",
          }}
        >
          That page <em className="ital">isn&apos;t here</em>.
        </h1>
        <p
          className="text-base md:text-lg mb-10 leading-relaxed"
          style={{ color: "var(--text-secondary)" }}
        >
          You followed a link or a bookmark to a page that has been moved
          or never existed. Pick the door you want and we&apos;ll get you
          back on track.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-10">
          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 rounded-xl text-sm font-medium no-underline transition-colors"
            style={{
              background: "var(--btn-primary-bg)",
              color: "var(--btn-primary-text)",
            }}
          >
            Back to homepage
          </Link>
          <Link
            href={ROUTES.APP_HOME}
            className="inline-flex items-center justify-center px-6 py-3 rounded-xl text-sm font-medium no-underline transition-colors"
            style={{
              border: "1px solid var(--btn-secondary-border)",
              color: "var(--text-primary)",
              background: "transparent",
            }}
          >
            Open the app
          </Link>
        </div>

        <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
          Or visit{" "}
          <Link
            href="/safety"
            className="underline"
            style={{ color: "var(--accent-primary)" }}
          >
            Agent Safety
          </Link>
          ,{" "}
          <Link
            href="/pricing"
            className="underline"
            style={{ color: "var(--accent-primary)" }}
          >
            Pricing
          </Link>
          , or the{" "}
          <Link
            href="/trust"
            className="underline"
            style={{ color: "var(--accent-primary)" }}
          >
            Trust Center
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
