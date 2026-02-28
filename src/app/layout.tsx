import type { Metadata } from "next";
import { Inter, Playfair_Display, Geist_Mono, JetBrains_Mono } from "next/font/google";
import "./globals.css";

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

export const metadata: Metadata = {
  metadataBase: new URL("https://recall-touch.com"),
  title: {
    template: "%s — Recall Touch",
    default: "Recall Touch — Commercial Execution Infrastructure",
  },
  description:
    "Govern every revenue-critical call. Recall Touch provides compliance-grade call governance, automated follow-ups, and auditable records for commercial operations.",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://recall-touch.com",
    siteName: "Recall Touch",
    title: "Recall Touch — Commercial Execution Infrastructure",
    description: "Govern every revenue-critical call. Compliance-grade call governance, automated follow-ups, and auditable records.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Recall Touch — Commercial Execution Infrastructure",
    description: "Govern every revenue-critical call.",
  },
};

const softwareApplicationJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Recall Touch",
  applicationCategory: "BusinessApplication",
  description:
    "Commercial execution infrastructure. Govern every revenue-critical call with compliance-grade recording, automated follow-ups, and auditable records.",
  url: "https://recall-touch.com",
  offers: {
    "@type": "AggregateOffer",
    lowPrice: "49",
    highPrice: "149",
    priceCurrency: "USD",
    offerCount: "3",
  },
  operatingSystem: "Web",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${playfair.variable} ${geistMono.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplicationJsonLd) }}
        />
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
