import { prisma } from "@/lib/prisma";
import type { AIConversationContext } from "@/types/ai";

export async function buildAIContextForSession(params: {
  sessionId?: string | null;
  leadId?: string | null;
  channel: "WEBSITE_CHAT" | "WHATSAPP";
}): Promise<AIConversationContext> {
  const [lead, latestDesign, latestImage, pricingEvent, consultationEvent] =
    await Promise.all([
      params.leadId ? prisma.lead.findUnique({ where: { id: params.leadId } }) : null,
      params.sessionId
        ? prisma.generatedDesign.findFirst({
            where: { sessionId: params.sessionId },
            orderBy: { createdAt: "desc" },
          })
        : null,
      params.sessionId
        ? prisma.imageAsset.findFirst({
            where: { sessionId: params.sessionId },
            orderBy: { createdAt: "desc" },
          })
        : null,
      params.sessionId
        ? prisma.websiteEvent.findFirst({
            where: { sessionId: params.sessionId, type: "PRICING_VIEWED" },
          })
        : null,
      params.sessionId
        ? prisma.websiteEvent.findFirst({
            where: { sessionId: params.sessionId, type: "CONSULTATION_VIEWED" },
          })
        : null,
    ]);

  return {
    channel: params.channel,
    visitorName: lead?.name ?? null,
    selectedStyle: lead?.style ?? latestDesign?.style ?? null,
    selectedRoomType: lead?.roomType ?? latestDesign?.roomType ?? null,
    uploadedImageDescription: latestImage
      ? `a ${latestImage.roomTypeGuess ?? "room"} photo uploaded ${latestImage.createdAt.toDateString()}`
      : null,
    uploadedImageUrl: latestImage?.url ?? null,
    uploadedImageMimeType: latestImage?.mimeType ?? null,
    lastGeneratedDesignSummary: latestDesign
      ? `a ${latestDesign.style} ${latestDesign.roomType} concept`
      : null,
    viewedPricing: Boolean(pricingEvent),
    viewedConsultation: Boolean(consultationEvent),
    knownEmail: lead?.email ?? null,
    knownPhone: lead?.phone ?? lead?.whatsappNumber ?? null,
    budget: lead?.budget ?? null,
    timeline: lead?.timeline ?? null,
    ownership: lead?.ownership ?? null,
    projectSize: lead?.projectSize ?? null,
  };
}
