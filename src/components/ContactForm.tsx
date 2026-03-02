"use client";

import { useState } from "react";

export function ContactForm() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = {
      name: (form.elements.namedItem("name") as HTMLInputElement)?.value?.trim() ?? "",
      email: (form.elements.namedItem("email") as HTMLInputElement)?.value?.trim() ?? "",
      company: (form.elements.namedItem("company") as HTMLInputElement)?.value?.trim() ?? "",
      message: (form.elements.namedItem("body") as HTMLTextAreaElement)?.value?.trim() ?? "",
    };
    if (!data.name || !data.email || !data.message) return;
    setLoading(true);
    try {
      try {
        localStorage.setItem("rt_contact", JSON.stringify({ ...data, at: Date.now() }));
      } catch {
        // ignore storage failures
      }
      await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).catch(() => {});
    } finally {
      setLoading(false);
      setSubmitted(true);
    }
  }

  if (submitted) {
    return (
      <p
        className="text-base"
        style={{ color: "var(--meaning-green)" }}
      >
        Thanks! We&apos;ll get back to you within 4 hours.
      </p>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4"
    >
      <div>
        <label
          htmlFor="name"
          className="block text-sm font-medium mb-1.5"
          style={{ color: "var(--text-secondary)" }}
        >
          Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          className="w-full px-4 py-2.5 rounded-lg text-sm border transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-offset-2 focus:ring-offset-[var(--bg-primary)]"
          style={{ background: "var(--bg-inset)", borderColor: "var(--border-default)", color: "var(--text-primary)" }}
        />
      </div>
      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium mb-1.5"
          style={{ color: "var(--text-secondary)" }}
        >
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="w-full px-4 py-2.5 rounded-lg text-sm border transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-offset-2 focus:ring-offset-[var(--bg-primary)]"
          style={{ background: "var(--bg-inset)", borderColor: "var(--border-default)", color: "var(--text-primary)" }}
        />
      </div>
      <div>
        <label
          htmlFor="company"
          className="block text-sm font-medium mb-1.5"
          style={{ color: "var(--text-secondary)" }}
        >
          Company
        </label>
        <input
          id="company"
          name="company"
          type="text"
          className="w-full px-4 py-2.5 rounded-lg text-sm border transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-offset-2 focus:ring-offset-[var(--bg-primary)]"
          style={{ background: "var(--bg-inset)", borderColor: "var(--border-default)", color: "var(--text-primary)" }}
        />
      </div>
      <div>
        <label
          htmlFor="body"
          className="block text-sm font-medium mb-1.5"
          style={{ color: "var(--text-secondary)" }}
        >
          Message
        </label>
        <textarea
          id="body"
          name="body"
          rows={4}
          required
          className="w-full px-4 py-2.5 rounded-lg text-sm border transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-offset-2 focus:ring-offset-[var(--bg-primary)] resize-y"
          style={{ background: "var(--bg-inset)", borderColor: "var(--border-default)", color: "var(--text-primary)" }}
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="btn-marketing-primary px-6 py-2.5 rounded-lg text-sm disabled:opacity-70"
      >
        {loading ? "Sending…" : "Send message →"}
      </button>
    </form>
  );
}

