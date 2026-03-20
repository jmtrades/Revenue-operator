"use client";

/**
 * Integration / partner logos displayed as a trust signal.
 * Uses text-based logos styled to look like brand wordmarks (no image assets needed).
 * These represent integrations and partners, NOT claims of endorsement.
 */
export function TrustLogosBar() {
  const integrations = [
    { name: "Google Calendar", style: "font-sans font-medium" },
    { name: "Salesforce", style: "font-sans font-bold italic" },
    { name: "HubSpot", style: "font-sans font-bold" },
    { name: "Zapier", style: "font-sans font-semibold" },
    { name: "Cal.com", style: "font-mono font-semibold" },
    { name: "Stripe", style: "font-sans font-bold" },
    { name: "Twilio", style: "font-sans font-semibold" },
    { name: "GoHighLevel", style: "font-sans font-bold" },
    { name: "ServiceTitan", style: "font-sans font-semibold" },
    { name: "Housecall Pro", style: "font-sans font-medium" },
  ];

  return (
    <div className="py-8">
      <p className="text-center text-xs font-medium tracking-wider uppercase mb-6" style={{ color: "var(--text-tertiary)" }}>
        Integrates with the tools you already use
      </p>
      <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
        {integrations.map((item) => (
          <span
            key={item.name}
            className={`text-sm ${item.style} opacity-40 hover:opacity-70 transition-opacity cursor-default`}
            style={{ color: "var(--text-primary)" }}
          >
            {item.name}
          </span>
        ))}
      </div>
    </div>
  );
}
