import { z } from "zod";

export const websiteEventTypeSchema = z.enum([
  "PAGE_VIEW",
  "STYLE_SELECTED",
  "ROOM_SELECTED",
  "DESIGN_GENERATED",
  "IMAGE_UPLOADED",
  "PRICING_VIEWED",
  "CONSULTATION_VIEWED",
  "WHATSAPP_CLICKED",
  "CTA_CLICKED",
  "CHAT_OPENED",
  "CHAT_MESSAGE_SENT",
]);

export const trackEventSchema = z.object({
  sessionToken: z.string().min(1),
  type: websiteEventTypeSchema,
  path: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  timeOnPageMs: z.number().nonnegative().optional(),
  referrer: z.string().optional(),
  utmSource: z.string().optional(),
  utmMedium: z.string().optional(),
  utmCampaign: z.string().optional(),
});

export const aiChatRequestSchema = z.object({
  sessionToken: z.string().min(1),
  message: z.string().min(1).max(4000),
  conversationId: z.string().optional(),
});

export const consultationRequestSchema = z.object({
  sessionToken: z.string().optional(),
  leadId: z.string().optional(),
  name: z.string().min(1).max(120),
  email: z.string().email(),
  phone: z.string().min(6).max(30),
  preferredDate: z.string().min(1),
  preferredTime: z.string().min(1),
  notes: z.string().max(2000).optional(),
});

export const adminLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const leadUpdateSchema = z.object({
  status: z
    .enum(["NEW", "CONTACTED", "QUALIFIED", "CONSULTATION_BOOKED", "WON", "LOST"])
    .optional(),
  assignedToId: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
});

export const leadNoteSchema = z.object({
  body: z.string().min(1).max(4000),
});
