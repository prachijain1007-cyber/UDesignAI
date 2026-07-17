import { NextResponse, type NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/admin-session";
import { leadUpdateSchema } from "@/lib/validations";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const lead = await prisma.lead.findUnique({
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
    });

    if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json(lead);
  } catch (error) {
    console.error("[admin/leads/:id] failed to load lead", error);
    return NextResponse.json({ error: "Failed to load lead" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = leadUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const lead = await prisma.lead.update({
      where: { id },
      data: parsed.data,
    });

    return NextResponse.json(lead);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    console.error("[admin/leads/:id] failed to update lead", error);
    return NextResponse.json({ error: "Failed to update lead" }, { status: 500 });
  }
}
