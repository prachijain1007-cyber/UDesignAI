import type { Lead, LeadNote, LeadScoreHistory, Consultation, Conversation, Message, VisitorSession, AdminUser } from "@prisma/client";

export type LeadListItem = Lead & {
  assignedTo: Pick<AdminUser, "id" | "name"> | null;
  _count: { conversations: number; consultations: number };
};

export type LeadDetail = Lead & {
  assignedTo: Pick<AdminUser, "id" | "name"> | null;
  notes: (LeadNote & { adminUser: Pick<AdminUser, "name"> | null })[];
  scoreHistory: LeadScoreHistory[];
  consultations: Consultation[];
  conversations: (Conversation & { messages: Message[] })[];
  session: VisitorSession | null;
};
