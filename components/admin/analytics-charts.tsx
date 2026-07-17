"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import type { DashboardAnalytics } from "@/services/analytics-service";

const GOLD = "#b8874f";
const TERRACOTTA = "#bc5b39";
const INK = "#1c1815";

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-brand-border bg-white p-6">
      <h2 className="mb-4 font-display text-lg text-brand-ink">{title}</h2>
      {children}
    </div>
  );
}

export function TopPagesChart({ data }: { data: DashboardAnalytics["topPages"] }) {
  return (
    <ChartCard title="Most Viewed Pages">
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={[...data]} layout="vertical" margin={{ left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e7ddcc" horizontal={false} />
          <XAxis type="number" allowDecimals={false} stroke="#8a7c68" fontSize={12} />
          <YAxis type="category" dataKey="path" width={110} stroke="#8a7c68" fontSize={12} />
          <Tooltip cursor={{ fill: "#f3ede2" }} />
          <Bar dataKey="count" fill={GOLD} radius={[0, 6, 6, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function TopCTAsChart({ data }: { data: DashboardAnalytics["topCTAs"] }) {
  return (
    <ChartCard title="Top Performing CTAs">
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={[...data]} layout="vertical" margin={{ left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e7ddcc" horizontal={false} />
          <XAxis type="number" allowDecimals={false} stroke="#8a7c68" fontSize={12} />
          <YAxis type="category" dataKey="cta" width={130} stroke="#8a7c68" fontSize={12} />
          <Tooltip cursor={{ fill: "#f3ede2" }} />
          <Bar dataKey="count" fill={TERRACOTTA} radius={[0, 6, 6, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function LeadSourcesChart({ data }: { data: DashboardAnalytics["leadsBySource"] }) {
  return (
    <ChartCard title="Lead Sources">
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={[...data]}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e7ddcc" vertical={false} />
          <XAxis dataKey="source" stroke="#8a7c68" fontSize={12} />
          <YAxis allowDecimals={false} stroke="#8a7c68" fontSize={12} />
          <Tooltip cursor={{ fill: "#f3ede2" }} />
          <Bar dataKey="count" fill={INK} radius={[6, 6, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function ConversionFunnel({ funnel }: { funnel: DashboardAnalytics["funnel"] }) {
  const stages = [
    { label: "Website Visitors", value: funnel.visitors },
    { label: "Leads Captured", value: funnel.leads },
    { label: "Consultations Booked", value: funnel.consultationsBooked },
    { label: "Won", value: funnel.won },
  ];
  const max = Math.max(...stages.map((s) => s.value), 1);

  return (
    <ChartCard title="Conversion Funnel">
      <div className="flex flex-col gap-4">
        {stages.map((stage) => (
          <div key={stage.label}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="text-brand-ink-soft/70">{stage.label}</span>
              <span className="font-medium text-brand-ink">{stage.value}</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-brand-ivory">
              <div
                className="h-full rounded-full bg-brand-gold"
                style={{ width: `${Math.max((stage.value / max) * 100, 3)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </ChartCard>
  );
}
