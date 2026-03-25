import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { Container } from "@/components/ui/Container";
import { ROUTES } from "@/lib/constants";
import { ContactForm } from "@/components/ContactForm";

const BASE = "https://www.recall-touch.com";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("contactPage");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: { canonical: `${BASE}/contact` },
    openGraph: {
      title: t("metaTitle"),
      description: t("metaDescription"),
      url: `${BASE}/contact`,
      siteName: "Recall Touch",
      type: "website",
      images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: t("metaTitle"),
      description: t("metaDescription"),
      images: ["/opengraph-image"],
    },
  };
}

export default async function ContactPage() {
  const t = await getTranslations("contactPage");

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}>
      <Navbar />
      <main className="pt-28 pb-24">
        <Container>
          <div className="max-w-3xl mx-auto">
            <h1 className="font-bold text-3xl md:text-4xl mb-4" style={{ letterSpacing: "-0.02em" }}>
              {t("heading")}
            </h1>
            <p className="text-lg mb-8" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
              {t("subheading")}
            </p>
            <div className="mb-8 p-4 rounded-xl border" style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}>
              <p className="font-medium" style={{ color: "var(--text-primary)" }}>hello@recall-touch.com</p>
              <p className="text-sm mt-1" style={{ color: "var(--text-tertiary)" }}>{t("responseTime")}</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-16">
              <div className="card-marketing p-8 flex flex-col">
                <h2 className="font-semibold text-lg mb-3" style={{ color: "var(--text-primary)" }}>
                  {t("salesEnterprise")}
                </h2>
                <p className="text-sm mb-6 flex-1" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
                  {t("salesEnterpriseDesc")}
                </p>
                <a href="mailto:enterprise@recall-touch.com?subject=Enterprise%20inquiry" className="btn-marketing-primary w-full block text-center py-3 rounded-lg no-underline">
                  {t("bookACall")}
                </a>
                <p className="text-xs mt-4" style={{ color: "var(--text-tertiary)" }}>
                  enterprise@recall-touch.com
                </p>
              </div>
              <div className="card-marketing p-8 flex flex-col">
                <h2 className="font-semibold text-lg mb-3" style={{ color: "var(--text-primary)" }}>
                  {t("support")}
                </h2>
                <p className="text-sm mb-6 flex-1" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
                  {t("supportDesc")}
                </p>
                <a href="mailto:support@recall-touch.com" className="btn-marketing-ghost w-full block text-center py-3 rounded-lg no-underline">
                  {t("emailSupport")}
                </a>
                <p className="text-xs mt-4" style={{ color: "var(--text-tertiary)" }}>
                  support@recall-touch.com
                </p>
              </div>
            </div>

            <div className="border rounded-lg p-8" style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}>
              <h2 className="font-semibold text-lg mb-4" style={{ color: "var(--text-primary)" }}>
                {t("sendMessage")}
              </h2>
              <ContactForm />
              <p className="text-sm mt-4" style={{ color: "var(--text-tertiary)" }}>
                hello@recall-touch.com · <a href="mailto:hello@recall-touch.com?subject=Schedule%20a%20call" className="underline" style={{ color: "var(--accent-primary)" }}>{t("scheduleCall")}</a>
              </p>
            </div>

            <p className="text-sm mt-8" style={{ color: "var(--text-tertiary)" }}>
              <Link href={ROUTES.START} className="underline hover:opacity-90" style={{ color: "var(--text-tertiary)" }}>{t("startFree")}</Link>
              {" · "}
              <Link href="/" className="underline hover:opacity-90" style={{ color: "var(--text-tertiary)" }}>{t("backToHome")}</Link>
            </p>
          </div>
        </Container>
      </main>
      <Footer />
    </div>
  );
}
