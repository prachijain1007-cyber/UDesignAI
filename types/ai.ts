export interface AIConversationContext {
  channel: "WEBSITE_CHAT" | "WHATSAPP";
  visitorName?: string | null;
  selectedStyle?: string | null;
  selectedRoomType?: string | null;
  uploadedImageDescription?: string | null;
  /** When set, the AI is given the actual photo (not just a text description) so it can genuinely see the room. */
  uploadedImageUrl?: string | null;
  uploadedImageMimeType?: string | null;
  lastGeneratedDesignSummary?: string | null;
  viewedPricing?: boolean;
  viewedConsultation?: boolean;
  knownEmail?: string | null;
  knownPhone?: string | null;
  budget?: string | null;
  timeline?: string | null;
  ownership?: string | null;
  projectSize?: string | null;
}

export interface AIChatTurnResult {
  reply: string;
  bookedConsultation: boolean;
  leadProfileUpdated: boolean;
  assistantMessageId: string;
}
