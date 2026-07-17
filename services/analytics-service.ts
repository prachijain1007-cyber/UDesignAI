import { prisma } from "@/lib/prisma";

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export async function getDashboardAnalytics() {
  const todayStart = startOfToday();

  const [
    totalSessions,
    totalLeads,
    todaysLeads,
    hotLeads,
    warmLeads,
    coldLeads,
    whatsappClickedSessions,
    aiConversations,
    bookings,
    wonLeads,
    leadsBySource,
    sessionsWithTime,
    ctaEvents,
    pageViewEvents,
    generatedDesigns,
  ] = await Promise.all([
    prisma.visitorSession.count(),
    prisma.lead.count(),
    prisma.lead.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.lead.count({ where: { tier: "HOT" } }),
    prisma.lead.count({ where: { tier: "WARM" } }),
    prisma.lead.count({ where: { tier: "COLD" } }),
    prisma.visitorSession.count({ where: { whatsappClicked: true } }),
    prisma.conversation.count(),
    prisma.consultation.count(),
    prisma.lead.findMany({ where: { status: "WON" }, select: { source: true, dealValue: true } }),
    prisma.lead.groupBy({ by: ["source"], _count: { _all: true } }),
    prisma.visitorSession.findMany({
      where: { pageViews: { gt: 0 } },
      select: { timeOnSiteMs: true },
      take: 5000,
    }),
    prisma.websiteEvent.findMany({
      where: { type: "CTA_CLICKED" },
      select: { metadata: true },
      take: 2000,
    }),
    prisma.websiteEvent.findMany({
      where: { type: "PAGE_VIEW" },
      select: { path: true },
      take: 5000,
    }),
    prisma.generatedDesign.findMany({
      where: { status: "COMPLETED" },
      select: { roomType: true, style: true },
      take: 5000,
    }),
  ]);

  const avgSessionDurationMs =
    sessionsWithTime.length > 0
      ? Math.round(
          sessionsWithTime.reduce((sum, s) => sum + s.timeOnSiteMs, 0) / sessionsWithTime.length
        )
      : 0;

  const ctaCounts = new Map<string, number>();
  for (const event of ctaEvents) {
    const cta = (event.metadata as { cta?: string } | null)?.cta ?? "unknown";
    ctaCounts.set(cta, (ctaCounts.get(cta) ?? 0) + 1);
  }
  const topCTAs = [...ctaCounts.entries()]
    .map(([cta, count]) => ({ cta, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const pageCounts = new Map<string, number>();
  for (const event of pageViewEvents) {
    const path = event.path ?? "/";
    pageCounts.set(path, (pageCounts.get(path) ?? 0) + 1);
  }
  const topPages = [...pageCounts.entries()]
    .map(([path, count]) => ({ path, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const roomCounts = new Map<string, number>();
  const styleCounts = new Map<string, number>();
  for (const design of generatedDesigns) {
    roomCounts.set(design.roomType, (roomCounts.get(design.roomType) ?? 0) + 1);
    styleCounts.set(design.style, (styleCounts.get(design.style) ?? 0) + 1);
  }
  const mostPopularRoom = [...roomCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const mostPopularStyle = [...styleCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const revenueBySource = new Map<string, number>();
  for (const lead of wonLeads) {
    revenueBySource.set(lead.source, (revenueBySource.get(lead.source) ?? 0) + (lead.dealValue ?? 0));
  }

  const conversionRate =
    totalSessions > 0 ? Math.round((totalLeads / totalSessions) * 1000) / 10 : 0;
  const bookingRate = totalLeads > 0 ? Math.round((bookings / totalLeads) * 1000) / 10 : 0;

  return {
    totalSessions,
    totalLeads,
    todaysLeads,
    leadsByTier: { hot: hotLeads, warm: warmLeads, cold: coldLeads },
    whatsappClicks: whatsappClickedSessions,
    aiConversations,
    bookings,
    conversionRate,
    bookingRate,
    avgSessionDurationMs,
    topCTAs,
    topPages,
    mostPopularRoom,
    mostPopularStyle,
    leadsBySource: leadsBySource.map((row) => ({ source: row.source, count: row._count._all })),
    revenueBySource: [...revenueBySource.entries()].map(([source, total]) => ({ source, total })),
    funnel: {
      visitors: totalSessions,
      leads: totalLeads,
      consultationsBooked: bookings,
      won: wonLeads.length,
    },
  };
}

export type DashboardAnalytics = Awaited<ReturnType<typeof getDashboardAnalytics>>;
