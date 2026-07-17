import { prisma } from "@/lib/prisma";
import { computeLeadScore, type LeadScoringInput } from "@/lib/lead-scoring-rules";
import type { Ownership } from "@prisma/client";

export async function rescoreLead(leadId: string) {
  const lead = await prisma.lead.findUniqueOrThrow({ where: { id: leadId } });

  const input: LeadScoringInput = {
    budget: lead.budget as LeadScoringInput["budget"],
    timeline: lead.timeline as LeadScoringInput["timeline"],
    urgency: lead.urgency as LeadScoringInput["urgency"],
    projectSize: lead.projectSize as LeadScoringInput["projectSize"],
    ownership: lead.ownership ?? undefined,
    decisionReadiness: lead.decisionReadiness as LeadScoringInput["decisionReadiness"],
  };

  const result = computeLeadScore(input);

  await prisma.$transaction([
    prisma.lead.update({
      where: { id: leadId },
      data: { score: result.score, tier: result.tier },
    }),
    prisma.leadScoreHistory.create({
      data: { leadId, score: result.score, tier: result.tier, reason: result.reason },
    }),
  ]);

  return result;
}

export interface LeadQualificationUpdate {
  budget?: string;
  timeline?: string;
  urgency?: string;
  projectSize?: string;
  ownership?: Ownership;
  decisionReadiness?: string;
  roomType?: string;
  style?: string;
  name?: string;
  email?: string;
  phone?: string;
}

export async function applyLeadQualification(leadId: string, update: LeadQualificationUpdate) {
  await prisma.lead.update({
    where: { id: leadId },
    data: {
      budget: update.budget,
      timeline: update.timeline,
      urgency: update.urgency,
      projectSize: update.projectSize,
      ownership: update.ownership,
      decisionReadiness: update.decisionReadiness,
      roomType: update.roomType,
      style: update.style,
      name: update.name,
      email: update.email,
      phone: update.phone,
      status: "QUALIFIED",
    },
  });

  return rescoreLead(leadId);
}
