export interface ClientSessionContext {
  sessionToken: string;
  firstVisitAt: string;
  selectedRoomType?: string;
  selectedStyle?: string;
  lastGeneratedDesignId?: string;
  lastGeneratedDesignSummary?: string;
  uploadedImage?: boolean;
  viewedPricing?: boolean;
  viewedConsultation?: boolean;
  visitedPaths: string[];
  name?: string;
  email?: string;
}

export type WebsiteEventType =
  | "PAGE_VIEW"
  | "STYLE_SELECTED"
  | "ROOM_SELECTED"
  | "DESIGN_GENERATED"
  | "IMAGE_UPLOADED"
  | "PRICING_VIEWED"
  | "CONSULTATION_VIEWED"
  | "WHATSAPP_CLICKED"
  | "CTA_CLICKED"
  | "CHAT_OPENED"
  | "CHAT_MESSAGE_SENT";

export interface TrackEventPayload {
  type: WebsiteEventType;
  path?: string;
  metadata?: Record<string, unknown>;
  timeOnPageMs?: number;
}

export interface DeviceInfo {
  deviceType: "mobile" | "tablet" | "desktop";
  browser: string;
  os: string;
}
