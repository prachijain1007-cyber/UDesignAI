import type { Content, FunctionDeclaration, Part } from "@google/genai";
import { prisma } from "@/lib/prisma";
import { getGeminiClient, AI_MODEL } from "@/services/gemini-client";
import { buildSystemPrompt } from "@/lib/ai-system-prompt";
import { applyLeadQualification } from "@/services/lead-scoring";
import { bookConsultation } from "@/services/consultation-service";
import { fetchFileBuffer } from "@/lib/fetch-file-buffer";
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

const functionDeclarations: FunctionDeclaration[] = [
  {
    name: "update_lead_profile",
    description:
      "Record or update qualification details you have learned about this visitor during the conversation. Call this as soon as you learn any single field — you do not need to wait until you know everything.",
    parametersJsonSchema: {
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
    },
  },
  {
    name: "book_consultation",
    description:
      "Book a free design consultation once you have collected preferred date, preferred time, email and phone.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        preferredDate: { type: "string", description: "e.g. '2026-07-22' or 'next Tuesday'" },
        preferredTime: { type: "string", description: "e.g. '3pm' or 'morning'" },
        email: { type: "string" },
        phone: { type: "string" },
        notes: { type: "string" },
      },
      required: ["preferredDate", "preferredTime", "email", "phone"],
    },
  },
];

const tools = [{ functionDeclarations }];

interface RunTurnParams {
  conversationId: string;
  leadId: string;
  sessionId: string | null;
  context: AIConversationContext;
  userMessage: string;
  incomingWhatsappMessageId?: string;
}

function extractOutputText(text: string | undefined): string {
  if (text && text.trim().length > 0) {
    return text.trim();
  }
  return "I'm here and thinking through that — could you tell me a little more?";
}

async function buildUserMessageParts(
  userMessage: string,
  context: AIConversationContext
): Promise<Part[]> {
  const parts: Part[] = [{ text: userMessage }];

  if (context.uploadedImageUrl && context.uploadedImageMimeType) {
    try {
      const buffer = await fetchFileBuffer(context.uploadedImageUrl);
      parts.push({
        inlineData: { mimeType: context.uploadedImageMimeType, data: buffer.toString("base64") },
      });
    } catch (error) {
      // If the photo can't be read, keep going text-only rather than failing the whole turn.
      console.error("[ai-designer] failed to attach uploaded room photo", error);
    }
  }

  return parts;
}

export async function runAssistantTurn(params: RunTurnParams): Promise<AIChatTurnResult> {
  const { conversationId, leadId, sessionId, context, userMessage, incomingWhatsappMessageId } = params;
  const ai = getGeminiClient();

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

  const contents: Content[] = [
    ...priorMessages.map(
      (m): Content => ({
        role: m.role === "ASSISTANT" ? "model" : "user",
        parts: [{ text: m.content }],
      })
    ),
    { role: "user", parts: await buildUserMessageParts(userMessage, context) },
  ];

  const systemInstruction = buildSystemPrompt(context);

  let response = await ai.models.generateContent({
    model: AI_MODEL,
    contents,
    config: { systemInstruction, tools },
  });

  let bookedConsultation = false;
  let leadProfileUpdated = false;
  let iterations = 0;

  while (iterations < 3) {
    const functionCalls = response.functionCalls ?? [];
    if (functionCalls.length === 0) break;

    const modelContent = response.candidates?.[0]?.content;
    if (modelContent) contents.push(modelContent);

    const responseParts: Part[] = [];

    for (const call of functionCalls) {
      let result: Record<string, unknown> = { ok: false };
      try {
        const args = (call.args ?? {}) as Record<string, unknown>;

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

      responseParts.push({ functionResponse: { name: call.name, response: result } });
    }

    contents.push({ role: "user", parts: responseParts });

    response = await ai.models.generateContent({
      model: AI_MODEL,
      contents,
      config: { systemInstruction, tools },
    });

    iterations += 1;
  }

  const reply = extractOutputText(response.text);

  const assistantMessage = await prisma.message.create({
    data: { conversationId, role: "ASSISTANT", content: reply },
  });

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });

  return { reply, bookedConsultation, leadProfileUpdated, assistantMessageId: assistantMessage.id };
}
