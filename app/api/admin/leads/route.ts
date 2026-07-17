import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/admin-session";
import type { LeadStatus, LeadTier } from "@prisma/client";

export async function GET(request: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const tier = searchParams.get("tier") as LeadTier | null;
  const status = searchParams.get("status") as LeadStatus | null;
  const search = searchParams.get("search");
  const assignedToId = searchParams.get("assignedToId");

  try {
    const leads = await prisma.lead.findMany({
      where: {
        tier: tier ?? undefined,
        status: status ?? undefined,
        assignedToId: assignedToId ?? undefined,
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
                { phone: { contains: search, mode: "insensitive" } },
                { whatsappNumber: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: {
        assignedTo: { select: { id: true, name: true } },
        _count: { select: { conversations: true, consultations: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    const tierPriority: Record<LeadTier, number> = { HOT: 0, WARM: 1, COLD: 2 };
    leads.sort((a, b) => tierPriority[a.tier] - tierPriority[b.tier]);

    return NextResponse.json(leads);
  } catch (error) {
    console.error("[admin/leads] failed to list leads", error);
    return NextResponse.json({ error: "Failed to load leads" }, { status: 500 });
  }
}
