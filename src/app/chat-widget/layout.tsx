import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Chat Widget",
  robots: "noindex, nofollow",
};

export default function ChatWidgetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>{children}</body>
    </html>
  );
}
