"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCookie } from "@/utils/cookies";
import { SESSION_COOKIE_NAME } from "@/lib/constants";

export function ConsultationForm() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    preferredDate: "",
    preferredTime: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/consultations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, sessionToken: getCookie(SESSION_COOKIE_NAME) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Something went wrong");
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-4 rounded-3xl border border-brand-border bg-brand-ivory/60 p-10 text-center"
      >
        <CheckCircle2 className="h-10 w-10 text-brand-sage" />
        <h2 className="font-display text-2xl text-brand-ink">You&rsquo;re all set, {form.name.split(" ")[0]}!</h2>
        <p className="max-w-sm text-sm text-brand-ink-soft/75">
          A designer will confirm your {form.preferredDate} at {form.preferredTime} slot shortly. Keep an eye on
          your inbox and WhatsApp.
        </p>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 rounded-3xl border border-brand-border bg-brand-ivory/60 p-8">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Full name">
          <input required value={form.name} onChange={(e) => update("name", e.target.value)} className="input" placeholder="Jane Doe" />
        </Field>
        <Field label="Email">
          <input required type="email" value={form.email} onChange={(e) => update("email", e.target.value)} className="input" placeholder="jane@email.com" />
        </Field>
        <Field label="Phone / WhatsApp">
          <input required value={form.phone} onChange={(e) => update("phone", e.target.value)} className="input" placeholder="+1 555 012 3456" />
        </Field>
        <Field label="Preferred date">
          <input required type="date" value={form.preferredDate} onChange={(e) => update("preferredDate", e.target.value)} className="input" />
        </Field>
        <Field label="Preferred time">
          <input required type="time" value={form.preferredTime} onChange={(e) => update("preferredTime", e.target.value)} className="input" />
        </Field>
      </div>
      <Field label="What are you looking to design? (optional)">
        <textarea
          value={form.notes}
          onChange={(e) => update("notes", e.target.value)}
          rows={3}
          className="input resize-none"
          placeholder="e.g. Full living room refresh on a mid-size budget"
        />
      </Field>

      {error && <p className="text-sm text-brand-terracotta">{error}</p>}

      <Button type="submit" variant="gold" size="lg" disabled={submitting} className="w-full">
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Book My Free Consultation"}
      </Button>

      <style jsx>{`
        :global(.input) {
          width: 100%;
          border-radius: 0.9rem;
          border: 1px solid var(--color-brand-border);
          background: white;
          padding: 0.7rem 1rem;
          font-size: 0.875rem;
          color: var(--color-brand-ink);
          outline: none;
        }
        :global(.input:focus) {
          border-color: var(--color-brand-gold);
        }
        :global(.dark) :global(.input) {
          background: color-mix(in srgb, var(--color-brand-ink-soft) 10%, transparent);
        }
      `}</style>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm text-brand-ink-soft/80">
      {label}
      {children}
    </label>
  );
}
