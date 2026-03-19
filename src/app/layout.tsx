import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { isRTL } from "@/lib/rtl";
import { DM_Sans, Playfair_Display, Geist_Mono, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// NOTE: validateEnv() is called in instrumentation.ts at server startup, NOT here.
// Calling it in layout.tsx runs during `next build` page-data collection when
// runtime-only env vars (STRIPE_SECRET_KEY etc.) are not yet available, which
// causes the production build to crash.
import { Toaster } from "sonner";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import { SwCleanup } from "@/components/SwCleanup";
import { StaleBuildBanner } from "@/components/StaleBuildBanner";

const dmSans = DM_Sans({
  variable: "--font-body-sans",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const playfair = Playfair_Display({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://www.recall-touch.com"),
  title: {
    template: "%s — Recall Touch",
    default: "Recall Touch — AI Revenue Operations Platform",
  },
  description:
    "The AI platform that runs your revenue operations — inbound, outbound, follow-up, booking, and attribution — so every opportunity converts and every dollar is tracked.",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://www.recall-touch.com",
    siteName: "Recall Touch",
    title: "Recall Touch — AI Revenue Operations Platform",
    description:
      "The AI platform that runs your revenue operations — inbound, outbound, follow-up, booking, and attribution — so every opportunity converts and every dollar is tracked.",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Recall Touch — AI Revenue Operations Platform" }],
  },
  icons: { icon: "/icon" },
  twitter: {
    card: "summary_large_image",
    title: "Recall Touch — AI Revenue Operations Platform",
    description:
      "The AI platform that runs your revenue operations — inbound, outbound, follow-up, booking, and attribution — so every opportunity converts and every dollar is tracked.",
  },
  robots: {
    index: true,
    follow: true,
  },
  manifest: "/manifest.json",
};

const BASE_URL = "https://www.recall-touch.com";

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Recall Touch",
  url: BASE_URL,
  description: "AI revenue operations platform. Automates inbound, outbound, follow-up, booking, and revenue attribution for every business.",
  sameAs: [
    // Add social profile URLs when they exist:
    // "https://twitter.com/recalltouch",
    // "https://linkedin.com/company/recalltouch",
  ],
};

const softwareApplicationJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Recall Touch",
  applicationCategory: "BusinessApplication",
  description:
    "AI revenue operations platform. Runs inbound and outbound communication, automated follow-up sequences, appointment booking, and revenue attribution.",
  url: BASE_URL,
  offers: {
    "@type": "AggregateOffer",
    lowPrice: "49",
    highPrice: "997",
    priceCurrency: "USD",
    offerCount: "4",
  },
  operatingSystem: "Web",
};

// Force dynamic so getLocale/getMessages always run with request context (fixes hero i18n keys on /)
export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let locale = await getLocale();
  let messages = await getMessages();
  // Fallback: ensure messages are never empty (e.g. static build or edge without request)
  if (!messages || Object.keys(messages as object).length === 0) {
    locale = "en";
    messages = (await import("@/i18n/messages/en.json")).default as Record<string, unknown>;
  }
  const t = await getTranslations("accessibility");

  return (
    <html lang={locale} dir={isRTL(locale) ? "rtl" : "ltr"} suppressHydrationWarning>
      <head suppressHydrationWarning>
        <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
      </head>
      <body
        suppressHydrationWarning
        className={`${dmSans.variable} ${playfair.variable} ${geistMono.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplicationJsonLd) }}
        />
        <NextIntlClientProvider locale={locale} messages={messages}>
          <SwCleanup />
          <StaleBuildBanner />
          <a href="#main" className="skip-link">
            {t("skipToContent")}
          </a>
          {children}
          <Toaster
            position="bottom-right"
            theme="dark"
            richColors
            closeButton
            toastOptions={{
              style: {
                background: "#1A1A1D",
                border: "1px solid rgba(255,255,255,0.06)",
                color: "#EDEDEF",
                fontSize: "14px",
                borderRadius: "12px",
              },
            }}
          />
          <SpeedInsights />
          <Analytics />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
