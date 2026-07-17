import type { ResponseInputItem, Tool } from "openai/resources/responses/responses";
import { prisma } from "@/lib/prisma";
import { getOpenAIClient, AI_MODEL } from "@/services/openai-client";
import { buildSystemPrompt } from "@/lib/ai-system-prompt";
import { applyLeadQualification } from "@/services/lead-scoring";
import { bookConsultation } from "@/services/consultation-service";
import {
  BUDGET_OPTIONS,
  TIMELINE_OPTIONS,
  URGENCY_OPTIONS,
  PROJECT_SIZE_OPTIONS,
  OWNERSHIP_OPTIONS,
  DECISION_READINESS_OPTIONS,
} from "@/lib/lead-scoring-rules";
import type { AIConversationContext, AIChatTurnResult } from "@/types/ai";
import type { Ownership } from "@prisma/client";

const tools: Tool[] = [
  {
    type: "function",
    name: "update_lead_profile",
    description:
      "Record or update qualification details you have learned about this visitor during the conversation. Call this as soon as you learn any single field — you do not need to wait until you know everything.",
    parameters: {
      type: "object",
      properties: {
        budget: { type: "string", enum: [...BUDGET_OPTIONS] },
        timeline: { type: "string", enum: [...TIMELINE_OPTIONS] },
        urgency: { type: "string", enum: [...URGENCY_OPTIONS] },
        projectSize: { type: "string", enum: [...PROJECT_SIZE_OPTIONS] },
        ownership: { type: "string", enum: [...OWNERSHIP_OPTIONS] },
        decisionReadiness: { type: "string", enum: [...DECISION_READINESS_OPTIONS] },
        roomType: { type: "string" },
        style: { type: "string" },
        name: { type: "string" },
        email: { type: "string" },
        phone: { type: "string" },
      },
      required: [],
      additionalProperties: false,
    },
    strict: false,
  },
  {
    type: "function",
    name: "book_consultation",
    description:
      "Book a free design consultation once you have collected preferred date, preferred time, email and phone.",
    parameters: {
      type: "object",
      properties: {
        preferredDate: { type: "string", description: "e.g. '2026-07-22' or 'next Tuesday'" },
        preferredTime: { type: "string", description: "e.g. '3pm' or 'morning'" },
        email: { type: "string" },
        phone: { type: "string" },
        notes: { type: "string" },
      },
      required: ["preferredDate", "preferredTime", "email", "phone"],
      additionalProperties: false,
    },
    strict: false,
  },
];

interface RunTurnParams {
  conversationId: string;
  leadId: string;
  sessionId: string | null;
  context: AIConversationContext;
  userMessage: string;
  incomingWhatsappMessageId?: string;
}

function extractOutputText(response: { output_text?: string }): string {
  if (response.output_text && response.output_text.trim().length > 0) {
    return response.output_text.trim();
  }
  return "I'm here and thinking through that — could you tell me a little more?";
}

export async function runAssistantTurn(params: RunTurnParams): Promise<AIChatTurnResult> {
  const { conversationId, leadId, sessionId, context, userMessage, incomingWhatsappMessageId } = params;
  const openai = getOpenAIClient();

  const priorMessages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    take: 30,
  });

  await prisma.message.create({
    data: {
      conversationId,
      role: "USER",
      content: userMessage,
      whatsappMessageId: incomingWhatsappMessageId,
    },
  });

  const input: ResponseInputItem[] = [
    ...priorMessages.map(
      (m): ResponseInputItem => ({
        role: m.role === "ASSISTANT" ? "assistant" : "user",
        content: m.content,
      })
    ),
    { role: "user", content: userMessage },
  ];

  let response = await openai.responses.create({
    model: AI_MODEL,
    instructions: buildSystemPrompt(context),
    input,
    tools,
  });

  let bookedConsultation = false;
  let leadProfileUpdated = false;
  let iterations = 0;

  while (iterations < 3) {
    const functionCalls = response.output.filter(
      (item): item is Extract<typeof item, { type: "function_call" }> =>
        item.type === "function_call"
    );
    if (functionCalls.length === 0) break;

    const toolOutputs: ResponseInputItem[] = [];

    for (const call of functionCalls) {
      let result: Record<string, unknown> = { ok: false };
      try {
        const args = JSON.parse(call.arguments || "{}") as Record<string, unknown>;

        if (call.name === "update_lead_profile") {
          const scoreResult = await applyLeadQualification(leadId, {
            budget: args.budget as string | undefined,
            timeline: args.timeline as string | undefined,
            urgency: args.urgency as string | undefined,
            projectSize: args.projectSize as string | undefined,
            ownership: args.ownership as Ownership | undefined,
            decisionReadiness: args.decisionReadiness as string | undefined,
            roomType: args.roomType as string | undefined,
            style: args.style as string | undefined,
            name: args.name as string | undefined,
            email: args.email as string | undefined,
            phone: args.phone as string | undefined,
          });
          leadProfileUpdated = true;
          result = { ok: true, tier: scoreResult.tier };
        } else if (call.name === "book_consultation") {
          const consultation = await bookConsultation({
            leadId,
            sessionId,
            email: args.email as string,
            phone: args.phone as string,
            preferredDate: args.preferredDate as string,
            preferredTime: args.preferredTime as string,
            notes: args.notes as string | undefined,
          });
          bookedConsultation = true;
          result = { ok: true, consultationId: consultation.id };
        }
      } catch (error) {
        result = { ok: false, error: error instanceof Error ? error.message : "Unknown error" };
      }

      toolOutputs.push({
        type: "function_call_output",
        call_id: call.call_id,
        output: JSON.stringify(result),
      });
    }

    response = await openai.responses.create({
      model: AI_MODEL,
      previous_response_id: response.id,
      input: toolOutputs,
      tools,
    });

    iterations += 1;
  }

  const reply = extractOutputText(response);

  const assistantMessage = await prisma.message.create({
    data: { conversationId, role: "ASSISTANT", content: reply },
  });

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });

  return { reply, bookedConsultation, leadProfileUpdated, assistantMessageId: assistantMessage.id };
}
