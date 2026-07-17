import { NextResponse, type NextRequest } from "next/server";
import { aiChatRequestSchema } from "@/lib/validations";
import { getOrCreateWebsiteConversation } from "@/services/conversation-service";
import { buildAIContextForSession } from "@/services/context-builder";
import { runAssistantTurn } from "@/services/ai-designer";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = aiChatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { sessionToken, message } = parsed.data;

  try {
    const { session, lead, conversation } = await getOrCreateWebsiteConversation(sessionToken);

    await prisma.websiteEvent.create({
      data: { sessionId: session.id, type: "CHAT_MESSAGE_SENT", metadata: { conversationId: conversation.id } },
    });

    const context = await buildAIContextForSession({
      sessionId: session.id,
      leadId: lead.id,
      channel: "WEBSITE_CHAT",
    });

    const result = await runAssistantTurn({
      conversationId: conversation.id,
      leadId: lead.id,
      sessionId: session.id,
      context,
      userMessage: message,
    });

    return NextResponse.json({
      reply: result.reply,
      conversationId: conversation.id,
      bookedConsultation: result.bookedConsultation,
    });
  } catch (error) {
    console.error("[ai/chat] failed", error);
    return NextResponse.json(
      { error: "The design assistant is temporarily unavailable. Please try again shortly." },
      { status: 502 }
    );
  }
}
