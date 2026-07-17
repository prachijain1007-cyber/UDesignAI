import { prisma } from "@/lib/prisma";
import { findOrCreateLeadForContact } from "@/services/consultation-service";

export async function getOrCreateWebsiteConversation(sessionToken: string) {
  const session = await prisma.visitorSession.upsert({
    where: { sessionToken },
    create: { sessionToken },
    update: {},
  });

  let lead = await prisma.lead.findUnique({ where: { sessionId: session.id } });
  if (!lead) {
    lead = await findOrCreateLeadForContact({ sessionId: session.id, source: "WEBSITE" });
  }

  let conversation = await prisma.conversation.findFirst({
    where: { sessionId: session.id, channel: "WEBSITE_CHAT", status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
  });

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        sessionId: session.id,
        leadId: lead.id,
        channel: "WEBSITE_CHAT",
        status: "ACTIVE",
      },
    });
  }

  return { session, lead, conversation };
}

const SESSION_REF_REGEX = /\[ref:\s*([a-z0-9-]{20,})\]/i;

export function extractSessionRef(message: string): string | null {
  const match = message.match(SESSION_REF_REGEX);
  return match ? match[1] : null;
}

export async function getOrCreateWhatsAppConversation(params: {
  whatsappPhone: string;
  rawMessage: string;
  profileName?: string | null;
}) {
  const sessionRef = extractSessionRef(params.rawMessage);
  const session = sessionRef
    ? await prisma.visitorSession.findUnique({ where: { sessionToken: sessionRef } })
    : null;

  let lead = await prisma.lead.findUnique({ where: { whatsappNumber: params.whatsappPhone } });

  if (!lead && session) {
    lead = await prisma.lead.findUnique({ where: { sessionId: session.id } });
  }

  if (!lead) {
    lead = await findOrCreateLeadForContact({
      whatsappNumber: params.whatsappPhone,
      sessionId: session?.id ?? null,
      name: params.profileName,
      source: "WHATSAPP",
    });
  } else {
    lead = await prisma.lead.update({
      where: { id: lead.id },
      data: {
        whatsappNumber: lead.whatsappNumber ?? params.whatsappPhone,
        sessionId: lead.sessionId ?? session?.id ?? undefined,
        name: lead.name ?? params.profileName ?? undefined,
      },
    });
  }

  let conversation = await prisma.conversation.findFirst({
    where: { whatsappPhone: params.whatsappPhone, channel: "WHATSAPP", status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
  });

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        leadId: lead.id,
        sessionId: session?.id ?? undefined,
        channel: "WHATSAPP",
        whatsappPhone: params.whatsappPhone,
        status: "ACTIVE",
      },
    });
  }

  return { session, lead, conversation };
}

export function stripSessionRef(message: string): string {
  return message.replace(SESSION_REF_REGEX, "").trim();
}
