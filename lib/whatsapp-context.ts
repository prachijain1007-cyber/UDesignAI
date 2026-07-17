import type { ClientSessionContext } from "@/types/session";

/**
 * Builds the pre-filled first WhatsApp message from whatever the visitor has
 * done on the site so far. The trailing `[ref: ...]` tag is parsed by the
 * WhatsApp webhook (see app/api/whatsapp/webhook/route.ts) to link the
 * incoming chat back to this browsing session/lead so the AI assistant never
 * has to re-ask for context it already has.
 */
export function buildWhatsAppContextMessage(context: ClientSessionContext): string {
  const parts: string[] = [];

  if (context.lastGeneratedDesignSummary) {
    parts.push(`Hi! I just generated ${context.lastGeneratedDesignSummary} on UDesign AI and I'd love your take on it.`);
  } else if (context.selectedStyle && context.selectedRoomType) {
    parts.push(
      `Hi! I'm exploring a ${context.selectedStyle} ${context.selectedRoomType} on UDesign AI and would love some guidance.`
    );
  } else if (context.selectedStyle) {
    parts.push(`Hi! I'm interested in a ${context.selectedStyle} design and would love some guidance.`);
  } else if (context.uploadedImage) {
    parts.push("Hi! I just uploaded a photo of my room on UDesign AI and I'd love some design ideas for it.");
  } else if (context.viewedConsultation) {
    parts.push("Hi! I'd like to book a design consultation with UDesign AI.");
  } else if (context.viewedPricing) {
    parts.push("Hi! I was just looking at UDesign AI's pricing and had a few questions.");
  } else {
    parts.push("Hi! I'd love to learn more about UDesign AI's interior design service.");
  }

  parts.push(`[ref: ${context.sessionToken}]`);

  return parts.join(" ");
}

export function buildWhatsAppLink(phoneNumber: string, message: string): string {
  const digits = phoneNumber.replace(/[^\d]/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
