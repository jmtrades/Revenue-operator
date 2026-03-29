import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Accept invitation",
  description: "Accept your team invitation to join a workspace on Revenue Operator.",
  robots: "noindex, nofollow",
};

export default function AcceptInviteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
