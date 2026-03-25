/**
 * Force dynamic so sign-in is not statically prerendered at build time.
 * Metadata here so client-only page can avoid server deps that may 503.
 */
export const dynamic = "force-dynamic";

const BASE = "https://www.recall-touch.com";

export const metadata = {
  title: { absolute: "Sign in — Recall Touch" },
  description: "Sign in or create your Recall Touch account.",
  alternates: { canonical: `${BASE}/sign-in` },
  openGraph: {
    title: "Sign in — Recall Touch",
    description: "Sign in or create your Recall Touch account.",
    url: `${BASE}/sign-in`,
    siteName: "Recall Touch",
    type: "website",
    images: [{ url: `${BASE}/opengraph-image`, width: 1200, height: 630, alt: "Recall Touch Sign In" }],
  },
  twitter: {
    card: "summary",
    title: "Sign in — Recall Touch",
    description: "Sign in or create your Recall Touch account.",
  },
};

export default function SignInLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
