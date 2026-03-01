/**
 * Force dynamic so sign-in is not statically prerendered at build time.
 * Supabase client requires NEXT_PUBLIC_SUPABASE_* env vars which may be
 * unset during Vercel build; this avoids running the page at build.
 */
export const dynamic = "force-dynamic";

export default function SignInLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
