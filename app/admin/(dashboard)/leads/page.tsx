import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { LeadsTable } from "@/components/admin/leads-table";
import { StatTile } from "@/components/admin/stat-tile";
import { getDashboardAnalytics } from "@/services/analytics-service";

export const metadata: Metadata = { title: "Leads", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const [leads, analytics] = await Promise.all([
    prisma.lead.findMany({
      include: {
        assignedTo: { select: { id: true, name: true } },
        _count: { select: { conversations: true, consultations: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    getDashboardAnalytics(),
  ]);

  const tierPriority = { HOT: 0, WARM: 1, COLD: 2 } as const;
  leads.sort((a, b) => tierPriority[a.tier] - tierPriority[b.tier]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-3xl text-brand-ink">Leads</h1>
        <p className="text-sm text-brand-ink-soft/60">Every visitor who has engaged with UDesign AI.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Today's Leads" value={analytics.todaysLeads} />
        <StatTile label="Hot Leads" value={analytics.leadsByTier.hot} accent="terracotta" />
        <StatTile label="Warm Leads" value={analytics.leadsByTier.warm} accent="gold" />
        <StatTile label="Cold Leads" value={analytics.leadsByTier.cold} />
      </div>

      <LeadsTable initialLeads={leads} />
    </div>
  );
}
