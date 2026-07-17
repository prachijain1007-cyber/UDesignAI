import type { Metadata } from "next";
import { getDashboardAnalytics } from "@/services/analytics-service";
import { StatTile } from "@/components/admin/stat-tile";
import {
  ConversionFunnel,
  TopPagesChart,
  TopCTAsChart,
  LeadSourcesChart,
} from "@/components/admin/analytics-charts";

export const metadata: Metadata = { title: "Analytics", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const analytics = await getDashboardAnalytics();
  const avgMinutes = Math.round(analytics.avgSessionDurationMs / 60000);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-3xl text-brand-ink">Analytics</h1>
        <p className="text-sm text-brand-ink-soft/60">Website performance, AI engagement and funnel health.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Website Visitors" value={analytics.totalSessions} />
        <StatTile label="WhatsApp Clicks" value={analytics.whatsappClicks} accent="sage" />
        <StatTile label="AI Conversations" value={analytics.aiConversations} accent="gold" />
        <StatTile label="Consultations Booked" value={analytics.bookings} accent="terracotta" />
        <StatTile label="Visitor → Lead Rate" value={analytics.conversionRate} suffix="%" />
        <StatTile label="Lead → Booking Rate" value={analytics.bookingRate} suffix="%" />
        <StatTile label="Avg. Session" value={avgMinutes} suffix="min" />
        <StatTile label="Most Popular Room" value={analytics.mostPopularRoom ?? "—"} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ConversionFunnel funnel={analytics.funnel} />
        <LeadSourcesChart data={analytics.leadsBySource} />
        <TopPagesChart data={analytics.topPages} />
        <TopCTAsChart data={analytics.topCTAs} />
      </div>

      {analytics.revenueBySource.length > 0 && (
        <div className="rounded-2xl border border-brand-border bg-white p-6">
          <h2 className="mb-4 font-display text-lg text-brand-ink">Revenue Attribution</h2>
          <div className="flex flex-wrap gap-6">
            {analytics.revenueBySource.map((row) => (
              <div key={row.source}>
                <p className="text-xs uppercase tracking-wide text-brand-ink-soft/40">{row.source}</p>
                <p className="font-display text-2xl text-brand-ink">${row.total.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
