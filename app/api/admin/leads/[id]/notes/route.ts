import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/admin-session";
import { leadNoteSchema } from "@/lib/validations";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = leadNoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const note = await prisma.leadNote.create({
      data: { leadId: id, adminUserId: admin.sub, body: parsed.data.body },
      include: { adminUser: { select: { name: true } } },
    });

    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    console.error("[admin/leads/:id/notes] failed to create note", error);
    return NextResponse.json({ error: "Failed to save note" }, { status: 500 });
  }
}
