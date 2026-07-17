import { prisma } from "@/lib/prisma";
import { rescoreLead } from "@/services/lead-scoring";

export interface BookConsultationInput {
  leadId?: string | null;
  sessionId?: string | null;
  name?: string | null;
  email: string;
  phone: string;
  preferredDate: string;
  preferredTime: string;
  notes?: string | null;
}

export async function findOrCreateLeadForContact(params: {
  sessionId?: string | null;
  whatsappNumber?: string | null;
  email?: string | null;
  phone?: string | null;
  name?: string | null;
  source: "WEBSITE" | "WHATSAPP" | "MANUAL";
}) {
  if (params.whatsappNumber) {
    const existing = await prisma.lead.findUnique({ where: { whatsappNumber: params.whatsappNumber } });
    if (existing) return existing;
  }

  if (params.sessionId) {
    const existing = await prisma.lead.findUnique({ where: { sessionId: params.sessionId } });
    if (existing) return existing;
  }

  return prisma.lead.create({
    data: {
      sessionId: params.sessionId ?? undefined,
      whatsappNumber: params.whatsappNumber ?? undefined,
      email: params.email ?? undefined,
      phone: params.phone ?? undefined,
      name: params.name ?? undefined,
      source: params.source,
    },
  });
}

export async function bookConsultation(input: BookConsultationInput) {
  let leadId = input.leadId ?? null;

  if (!leadId) {
    const lead = await findOrCreateLeadForContact({
      sessionId: input.sessionId,
      email: input.email,
      phone: input.phone,
      name: input.name,
      source: "WEBSITE",
    });
    leadId = lead.id;
  } else {
    await prisma.lead.update({
      where: { id: leadId },
      data: {
        email: input.email,
        phone: input.phone,
        name: input.name ?? undefined,
      },
    });
  }

  const consultation = await prisma.consultation.create({
    data: {
      leadId,
      sessionId: input.sessionId ?? undefined,
      preferredDate: input.preferredDate,
      preferredTime: input.preferredTime,
      email: input.email,
      phone: input.phone,
      notes: input.notes ?? undefined,
      status: "REQUESTED",
    },
  });

  await prisma.lead.update({
    where: { id: leadId },
    data: { status: "CONSULTATION_BOOKED", decisionReadiness: "ready_to_book" },
  });

  await rescoreLead(leadId);

  return consultation;
}
