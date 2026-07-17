import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { LeadDetailView } from "@/components/admin/lead-detail-view";

export const metadata: Metadata = { title: "Lead Detail", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [lead, adminUsers] = await Promise.all([
    prisma.lead.findUnique({
      where: { id },
      include: {
        assignedTo: { select: { id: true, name: true } },
        notes: { include: { adminUser: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
        scoreHistory: { orderBy: { createdAt: "desc" }, take: 10 },
        consultations: { orderBy: { createdAt: "desc" } },
        conversations: {
          orderBy: { createdAt: "desc" },
          include: { messages: { orderBy: { createdAt: "asc" } } },
        },
        session: true,
      },
    }),
    prisma.adminUser.findMany({ select: { id: true, name: true } }),
  ]);

  if (!lead) notFound();

  return <LeadDetailView lead={lead} adminUsers={adminUsers} />;
}
