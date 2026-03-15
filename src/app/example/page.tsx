import { redirect } from "next/navigation";

export default function ExamplePage() {
  const demoRef = process.env.DEMO_EXTERNAL_REF ?? process.env.NEXT_PUBLIC_DEMO_EXTERNAL_REF ?? "";
  if (!demoRef) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-stone-50 p-6">
        <p className="text-[18px] text-stone-500">Demo not configured.</p>
      </main>
    );
  }
  redirect(`/public/work/${encodeURIComponent(demoRef)}`);
}
