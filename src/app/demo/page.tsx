import { cookies } from "next/headers";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { DemoSimulatorSection } from "@/components/demo/DemoSimulatorSection";
import { DemoPageContent } from "./DemoPageContent";
import Link from "next/link";
import { ROUTES } from "@/lib/constants";

export const metadata = {
  title: "Try the AI",
  description: "Talk to your AI. Right now. Same AI that handles real calls.",
};

export default async function DemoPage() {
  const cookieStore = await cookies();
  const initialAuthenticated =
    cookieStore.has("revenue_session") ||
    cookieStore.getAll().some((c) => c.name.startsWith("sb-"));

  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}
    >
      <Navbar initialAuthenticated={initialAuthenticated} />
      <main className="pt-28 pb-24">
        <DemoPageContent />

        <div className="max-w-3xl mx-auto px-4 mt-16">
          <div className="flex items-center justify-between gap-3 mb-6">
            <div>
              <h2 className="text-xl font-semibold text-white">Watch a sample call</h2>
              <p className="text-sm text-zinc-400 mt-1">
                Starts automatically when this section loads, then shows the captured result.
              </p>
            </div>
            <Link href={ROUTES.START} className="btn-marketing-primary no-underline inline-flex items-center justify-center">
              Start free → 5 minute setup
            </Link>
          </div>
          <DemoSimulatorSection />
        </div>
      </main>
      <Footer />
    </div>
  );
}
