/**
 * Force dynamic so sign-in is not statically prerendered at build time.
 * Metadata here so client-only page can avoid server deps that may 503.
 */
export const dynamic = "force-dynamic";

export const metadata = {
  title: { absolute: "Sign in — Recall Touch" },
  description: "Sign in or create your Recall Touch account.",
};

export default function SignInLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
