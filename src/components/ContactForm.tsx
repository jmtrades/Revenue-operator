"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

export function ContactForm() {
  const t = useTranslations("contactPage");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const data = {
      name: (form.elements.namedItem("name") as HTMLInputElement)?.value?.trim() ?? "",
      email: (form.elements.namedItem("email") as HTMLInputElement)?.value?.trim() ?? "",
      company: (form.elements.namedItem("company") as HTMLInputElement)?.value?.trim() ?? "",
      subject: (form.elements.namedItem("subject") as HTMLSelectElement)?.value ?? "General",
      message: (form.elements.namedItem("body") as HTMLTextAreaElement)?.value?.trim() ?? "",
    };
    if (!data.name || !data.email || !data.message) {
      setError(t("fillRequired"));
      return;
    }
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
        {t("thanksReply")}
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
          {t("formName")}
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
          {t("formEmail")}
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
          {t("formCompany")}
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
          htmlFor="subject"
          className="block text-sm font-medium mb-1.5"
          style={{ color: "var(--text-secondary)" }}
        >
          {t("formSubject")}
        </label>
        <select
          id="subject"
          name="subject"
          className="w-full px-4 py-2.5 rounded-lg text-sm border transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-offset-2 focus:ring-offset-[var(--bg-primary)]"
          style={{ background: "var(--bg-inset)", borderColor: "var(--border-default)", color: "var(--text-primary)" }}
        >
          <option value="General">{t("subjectGeneral")}</option>
          <option value="Sales">{t("subjectSales")}</option>
          <option value="Support">{t("subjectSupport")}</option>
          <option value="Billing">{t("subjectBilling")}</option>
          <option value="Partnership">{t("subjectPartnership")}</option>
        </select>
      </div>
      <div>
        <label
          htmlFor="body"
          className="block text-sm font-medium mb-1.5"
          style={{ color: "var(--text-secondary)" }}
        >
          {t("formMessage")}
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
      {error && (
        <p className="text-sm" style={{ color: "var(--accent-danger)" }}>{error}</p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="btn-marketing-primary px-6 py-2.5 rounded-lg text-sm disabled:opacity-70"
      >
        {loading ? t("sending") : t("sendMessage")}
      </button>
    </form>
  );
}

