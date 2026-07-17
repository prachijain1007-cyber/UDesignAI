"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Search, Loader2 } from "lucide-react";
import { TierBadge } from "@/components/admin/tier-badge";
import { cn } from "@/utils/cn";
import type { LeadListItem } from "@/types/admin";
import type { LeadStatus, LeadTier } from "@prisma/client";

const STATUS_OPTIONS: LeadStatus[] = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "CONSULTATION_BOOKED",
  "WON",
  "LOST",
];
const TIER_OPTIONS: LeadTier[] = ["HOT", "WARM", "COLD"];

export function LeadsTable({ initialLeads }: { initialLeads: LeadListItem[] }) {
  const [leads, setLeads] = useState(initialLeads);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [tier, setTier] = useState<LeadTier | "">("");
  const [status, setStatus] = useState<LeadStatus | "">("");

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (tier) params.set("tier", tier);
    if (status) params.set("status", status);

    try {
      const response = await fetch(`/api/admin/leads?${params.toString()}`);
      if (response.ok) setLeads(await response.json());
    } finally {
      setLoading(false);
    }
  }, [search, tier, status]);

  useEffect(() => {
    const timeout = setTimeout(fetchLeads, 300);
    return () => clearTimeout(timeout);
  }, [fetchLeads]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-ink-soft/40" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, phone..."
            className="w-64 rounded-full border border-brand-border bg-white py-2 pl-9 pr-4 text-sm outline-none focus:border-brand-gold"
          />
        </div>

        <select
          value={tier}
          onChange={(e) => setTier(e.target.value as LeadTier | "")}
          className="rounded-full border border-brand-border bg-white px-4 py-2 text-sm outline-none"
        >
          <option value="">All tiers</option>
          {TIER_OPTIONS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as LeadStatus | "")}
          className="rounded-full border border-brand-border bg-white px-4 py-2 text-sm outline-none"
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, " ")}
            </option>
          ))}
        </select>

        {loading && <Loader2 className="h-4 w-4 animate-spin text-brand-ink-soft/50" />}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-brand-border bg-white">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-brand-border bg-brand-ivory/60 text-xs uppercase tracking-wide text-brand-ink-soft/60">
            <tr>
              <th className="px-5 py-3">Lead</th>
              <th className="px-5 py-3">Tier</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Source</th>
              <th className="px-5 py-3">Assigned</th>
              <th className="px-5 py-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id} className="border-b border-brand-border/60 last:border-0 hover:bg-brand-ivory/40">
                <td className="px-5 py-3">
                  <Link href={`/admin/leads/${lead.id}`} className="font-medium text-brand-ink hover:text-brand-gold-dark">
                    {lead.name ?? lead.email ?? lead.whatsappNumber ?? "Unnamed lead"}
                  </Link>
                  <p className="text-xs text-brand-ink-soft/50">{lead.email ?? lead.phone ?? lead.whatsappNumber}</p>
                </td>
                <td className="px-5 py-3">
                  <TierBadge tier={lead.tier} />
                </td>
                <td className={cn("px-5 py-3 text-xs font-medium uppercase tracking-wide text-brand-ink-soft/70")}>
                  {lead.status.replace(/_/g, " ")}
                </td>
                <td className="px-5 py-3 text-brand-ink-soft/70">{lead.source}</td>
                <td className="px-5 py-3 text-brand-ink-soft/70">{lead.assignedTo?.name ?? "Unassigned"}</td>
                <td className="px-5 py-3 text-brand-ink-soft/50">
                  {new Date(lead.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {leads.length === 0 && !loading && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-brand-ink-soft/50">
                  No leads match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
