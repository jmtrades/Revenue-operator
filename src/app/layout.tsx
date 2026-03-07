import type { Metadata } from "next";
import { Inter, Playfair_Display, Geist_Mono, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { SwCleanup } from "@/components/SwCleanup";

const inter = Inter({
  variable: "--font-body-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
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
  metadataBase: new URL("https://recall-touch.com"),
  title: {
    template: "%s — Recall Touch",
    default: "Recall Touch — AI Phone & Text Communication",
  },
  description:
    "Recall Touch is the AI phone system that handles your calls, texts, follow-ups, and scheduling automatically. Works with any number. Set up in 5 minutes.",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://recall-touch.com",
    siteName: "Recall Touch",
    title: "Recall Touch — AI Phone & Text Communication",
    description: "AI that handles your calls, texts, follow-ups, and scheduling. For any business or team.",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Recall Touch — AI Phone & Text Communication" }],
  },
  icons: { icon: "/icon" },
  twitter: {
    card: "summary_large_image",
    title: "Recall Touch — AI Phone & Text Communication",
    description: "AI that handles your calls, texts, follow-ups, and scheduling. For any business or team.",
  },
  manifest: "/manifest.json",
};

const softwareApplicationJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Recall Touch",
  applicationCategory: "BusinessApplication",
  description:
    "AI phone system for every business. Answer every call 24/7, follow up with leads in 60 seconds, book appointments. Set up in 5 minutes.",
  url: "https://recall-touch.com",
  offers: {
    "@type": "AggregateOffer",
    lowPrice: "97",
    highPrice: "497",
    priceCurrency: "USD",
    offerCount: "4",
  },
  operatingSystem: "Web",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
      </head>
      <body
        suppressHydrationWarning
        className={`${inter.variable} ${playfair.variable} ${geistMono.variable} ${jetbrainsMono.variable} bg-black text-white antialiased`}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplicationJsonLd) }}
        />
        <SwCleanup />
        <a
          href="#main"
          className="skip-link"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
