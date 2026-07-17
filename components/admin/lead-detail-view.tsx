"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Plus, X } from "lucide-react";
import { TierBadge } from "@/components/admin/tier-badge";
import { cn } from "@/utils/cn";
import type { LeadDetail } from "@/types/admin";
import type { LeadStatus } from "@prisma/client";

const STATUS_OPTIONS: LeadStatus[] = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "CONSULTATION_BOOKED",
  "WON",
  "LOST",
];

const QUALIFICATION_FIELDS: Array<{ key: keyof LeadDetail; label: string }> = [
  { key: "budget", label: "Budget" },
  { key: "timeline", label: "Timeline" },
  { key: "urgency", label: "Urgency" },
  { key: "projectSize", label: "Project Size" },
  { key: "ownership", label: "Ownership" },
  { key: "decisionReadiness", label: "Decision Readiness" },
  { key: "roomType", label: "Room" },
  { key: "style", label: "Style" },
];

export function LeadDetailView({
  lead,
  adminUsers,
}: {
  lead: LeadDetail;
  adminUsers: { id: string; name: string }[];
}) {
  const [status, setStatus] = useState(lead.status);
  const [assignedToId, setAssignedToId] = useState(lead.assignedToId ?? "");
  const [tags, setTags] = useState<string[]>(lead.tags);
  const [tagInput, setTagInput] = useState("");
  const [notes, setNotes] = useState(lead.notes);
  const [noteInput, setNoteInput] = useState("");
  const [saving, setSaving] = useState(false);

  async function patchLead(data: Record<string, unknown>) {
    setSaving(true);
    try {
      await fetch(`/api/admin/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleAddTag() {
    const value = tagInput.trim();
    if (!value || tags.includes(value)) return;
    const next = [...tags, value];
    setTags(next);
    setTagInput("");
    await patchLead({ tags: next });
  }

  async function handleRemoveTag(tag: string) {
    const next = tags.filter((t) => t !== tag);
    setTags(next);
    await patchLead({ tags: next });
  }

  async function handleAddNote() {
    if (!noteInput.trim()) return;
    const response = await fetch(`/api/admin/leads/${lead.id}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: noteInput }),
    });
    if (response.ok) {
      const note = await response.json();
      setNotes((prev) => [note, ...prev]);
      setNoteInput("");
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <Link href="/admin/leads" className="flex w-fit items-center gap-2 text-sm text-brand-ink-soft/60 hover:text-brand-ink">
        <ArrowLeft className="h-4 w-4" /> Back to leads
      </Link>

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-3xl text-brand-ink">{lead.name ?? "Unnamed lead"}</h1>
            <TierBadge tier={lead.tier} />
            {saving && <Loader2 className="h-4 w-4 animate-spin text-brand-ink-soft/40" />}
          </div>
          <p className="mt-1 text-sm text-brand-ink-soft/60">
            {lead.email ?? "No email"} · {lead.phone ?? lead.whatsappNumber ?? "No phone"} · Score {lead.score}/100
          </p>
        </div>

        <div className="flex gap-3">
          <select
            value={status}
            onChange={(e) => {
              const value = e.target.value as LeadStatus;
              setStatus(value);
              patchLead({ status: value });
            }}
            aria-label="Lead status"
            className="rounded-full border border-brand-border bg-white px-4 py-2 text-sm"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, " ")}
              </option>
            ))}
          </select>

          <select
            value={assignedToId}
            onChange={(e) => {
              setAssignedToId(e.target.value);
              patchLead({ assignedToId: e.target.value || null });
            }}
            aria-label="Assigned team member"
            className="rounded-full border border-brand-border bg-white px-4 py-2 text-sm"
          >
            <option value="">Unassigned</option>
            {adminUsers.map((admin) => (
              <option key={admin.id} value={admin.id}>
                {admin.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <section className="rounded-2xl border border-brand-border bg-white p-6">
            <h2 className="mb-4 font-display text-lg text-brand-ink">Qualification</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {QUALIFICATION_FIELDS.map((field) => (
                <div key={String(field.key)}>
                  <p className="text-xs uppercase tracking-wide text-brand-ink-soft/40">{field.label}</p>
                  <p className="mt-1 text-sm text-brand-ink">
                    {(lead[field.key] as string | null) ?? "—"}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1.5 rounded-full bg-brand-gold/10 px-3 py-1 text-xs text-brand-gold-dark"
                >
                  {tag}
                  <button type="button" onClick={() => handleRemoveTag(tag)} aria-label={`Remove tag ${tag}`}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              <div className="flex items-center gap-1">
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
                  placeholder="Add tag"
                  aria-label="New tag"
                  className="w-24 rounded-full border border-dashed border-brand-border px-3 py-1 text-xs outline-none focus:border-brand-gold"
                />
                <button type="button" onClick={handleAddTag} aria-label="Add tag">
                  <Plus className="h-4 w-4 text-brand-ink-soft/50" />
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-brand-border bg-white p-6">
            <h2 className="mb-4 font-display text-lg text-brand-ink">Conversations</h2>
            <div className="flex flex-col gap-6">
              {lead.conversations.length === 0 && (
                <p className="text-sm text-brand-ink-soft/50">No conversations yet.</p>
              )}
              {lead.conversations.map((conversation) => (
                <div key={conversation.id}>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-ink-soft/40">
                    {conversation.channel === "WHATSAPP" ? "WhatsApp" : "Website Chat"} ·{" "}
                    {new Date(conversation.createdAt).toLocaleString()}
                  </p>
                  <div className="flex flex-col gap-2 rounded-xl bg-brand-ivory/50 p-4">
                    {conversation.messages.map((message) => (
                      <div
                        key={message.id}
                        className={cn(
                          "max-w-[80%] rounded-xl px-3 py-2 text-sm",
                          message.role === "USER"
                            ? "ml-auto bg-brand-ink text-brand-cream"
                            : message.role === "ASSISTANT"
                              ? "bg-white text-brand-ink-soft"
                              : "bg-brand-gold/10 text-brand-ink-soft"
                        )}
                      >
                        {message.content}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="flex flex-col gap-6">
          <section className="rounded-2xl border border-brand-border bg-white p-6">
            <h2 className="mb-4 font-display text-lg text-brand-ink">Consultations</h2>
            {lead.consultations.length === 0 && (
              <p className="text-sm text-brand-ink-soft/50">No consultations booked.</p>
            )}
            <ul className="flex flex-col gap-3">
              {lead.consultations.map((c) => (
                <li key={c.id} className="rounded-xl bg-brand-ivory/50 p-3 text-sm">
                  <p className="font-medium text-brand-ink">
                    {c.preferredDate} at {c.preferredTime}
                  </p>
                  <p className="text-xs text-brand-ink-soft/50">{c.status}</p>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-brand-border bg-white p-6">
            <h2 className="mb-4 font-display text-lg text-brand-ink">Notes</h2>
            <div className="flex flex-col gap-3">
              <textarea
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                rows={3}
                placeholder="Leave a note for the team..."
                aria-label="New note"
                className="rounded-xl border border-brand-border p-3 text-sm outline-none focus:border-brand-gold"
              />
              <button
                type="button"
                onClick={handleAddNote}
                className="self-end rounded-full bg-brand-gold px-4 py-1.5 text-xs font-semibold text-brand-ink"
              >
                Add note
              </button>
            </div>
            <ul className="mt-4 flex flex-col gap-3">
              {notes.map((note) => (
                <li key={note.id} className="rounded-xl bg-brand-ivory/50 p-3 text-sm">
                  <p className="text-brand-ink-soft/90">{note.body}</p>
                  <p className="mt-1 text-xs text-brand-ink-soft/40">
                    {note.adminUser?.name ?? "Admin"} · {new Date(note.createdAt).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
