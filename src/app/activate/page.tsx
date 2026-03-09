export const metadata = {
  title: "Activate your agent",
  description: "Guided setup to hear your phone agent handle a real call.",
};

import { Navbar } from "@/components/sections/Navbar";
import { ActivateWizard } from "./ActivateWizard";

export default function ActivatePage() {
  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
      <Navbar />
      <main className="pt-24 pb-20">
        <ActivateWizard />
      </main>
    </div>
  );
}

