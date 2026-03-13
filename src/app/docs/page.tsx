import type { Metadata } from "next";
import DocsPageContent from "./DocsPageContent";

export const metadata: Metadata = {
  title: "Docs",
  description:
    "Step-by-step guides for forwarding your number, setting up your AI phone agent, launching campaigns, and integrating Recall Touch.",
};

export default function DocsPage() {
  return <DocsPageContent />;
}
