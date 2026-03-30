import type { Metadata } from "next";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { ResendVerificationButton } from "./ResendVerificationButton";

const BASE_URL = "https://www.recall-touch.com";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Verify your email — Revenue Operator",
    description: "Check your inbox for a verification link. Resend if you didn’t receive it.",
    alternates: { canonical: `${BASE_URL}/verify-email` },
    robots: { index: false, follow: false },
  };
}

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams?: Promise<{ email?: string }>;
}) {
  const params = await searchParams;
  const email = (params?.email ?? "").trim();

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}>
      <Navbar />
      <main className="pt-28 pb-24">
        <section className="max-w-2xl mx-auto px-4">
          <h1 className="text-3xl font-semibold" style={{ color: "var(--text-primary)" }}>
            Check your inbox
          </h1>
          <p className="mt-4 text-base" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
            We sent a verification link to{" "}
            <span style={{ color: "var(--text-primary)" }}>{email || "your email"}</span>. Once it’s confirmed, you’ll be able to continue.
          </p>

          <div className="mt-8">
            <ResendVerificationButton email={email} />
          </div>

          <p className="mt-6 text-sm" style={{ color: "var(--text-tertiary)", lineHeight: 1.7 }}>
            Didn’t see it? Check spam and promotions folders.
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}

