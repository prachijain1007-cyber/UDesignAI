import { NextResponse, type NextRequest } from "next/server";
import { consultationRequestSchema } from "@/lib/validations";
import { bookConsultation, findOrCreateLeadForContact } from "@/services/consultation-service";
import { prisma } from "@/lib/prisma";
import { rateLimitResponse } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const limited = rateLimitResponse(request, "consultations", { limit: 5, windowMs: 60_000 });
  if (limited) return limited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = consultationRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { sessionToken, name, email, phone, preferredDate, preferredTime, notes } = parsed.data;

  try {
    let sessionId: string | null = null;
    if (sessionToken) {
      const session = await prisma.visitorSession.upsert({
        where: { sessionToken },
        create: { sessionToken },
        update: {},
      });
      sessionId = session.id;
    }

    const lead = await findOrCreateLeadForContact({
      sessionId,
      email,
      phone,
      name,
      source: "WEBSITE",
    });

    const consultation = await bookConsultation({
      leadId: lead.id,
      sessionId,
      name,
      email,
      phone,
      preferredDate,
      preferredTime,
      notes,
    });

    return NextResponse.json(consultation, { status: 201 });
  } catch (error) {
    console.error("[consultations] failed to book consultation", error);
    return NextResponse.json(
      { error: "We couldn't book that consultation right now. Please try again shortly." },
      { status: 500 }
    );
  }
}
