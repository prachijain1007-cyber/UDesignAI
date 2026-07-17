import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyWhatsAppSignature } from "@/lib/whatsapp-signature";
import {
  getOrCreateWhatsAppConversation,
  stripSessionRef,
} from "@/services/conversation-service";
import { buildAIContextForSession } from "@/services/context-builder";
import { runAssistantTurn } from "@/services/ai-designer";
import { sendWhatsAppTextMessage } from "@/services/whatsapp-cloud";
import type { MessageDeliveryStatus } from "@prisma/client";

// --- Meta webhook subscription verification (GET) ---------------------------

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

// --- Incoming messages & status callbacks (POST) -----------------------------

interface WhatsAppValue {
  messages?: Array<{
    id: string;
    from: string;
    timestamp: string;
    type: string;
    text?: { body: string };
  }>;
  statuses?: Array<{ id: string; status: string }>;
  contacts?: Array<{ profile?: { name?: string } }>;
}

const STATUS_MAP: Record<string, MessageDeliveryStatus> = {
  sent: "SENT",
  delivered: "DELIVERED",
  read: "READ",
  failed: "FAILED",
};

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");

  if (!verifyWhatsAppSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: { entry?: Array<{ changes?: Array<{ value?: WhatsAppValue }> }> };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const values =
    payload.entry?.flatMap((entry) => entry.changes?.map((change) => change.value) ?? []) ?? [];

  for (const value of values) {
    if (!value) continue;

    for (const status of value.statuses ?? []) {
      const mapped = STATUS_MAP[status.status];
      if (!mapped) continue;
      await prisma.message
        .updateMany({ where: { whatsappMessageId: status.id }, data: { deliveryStatus: mapped } })
        .catch(() => {});
    }

    for (const message of value.messages ?? []) {
      if (message.type !== "text" || !message.text) continue;

      const alreadyProcessed = await prisma.message.findUnique({
        where: { whatsappMessageId: message.id },
      });
      if (alreadyProcessed) continue;

      const profileName = value.contacts?.[0]?.profile?.name ?? null;

      try {
        const { session, lead, conversation } = await getOrCreateWhatsAppConversation({
          whatsappPhone: message.from,
          rawMessage: message.text.body,
          profileName,
        });

        const cleanMessage = stripSessionRef(message.text.body) || message.text.body;

        const context = await buildAIContextForSession({
          sessionId: session?.id ?? lead.sessionId,
          leadId: lead.id,
          channel: "WHATSAPP",
        });

        const result = await runAssistantTurn({
          conversationId: conversation.id,
          leadId: lead.id,
          sessionId: session?.id ?? lead.sessionId ?? null,
          context,
          userMessage: cleanMessage,
          incomingWhatsappMessageId: message.id,
        });

        const sent = await sendWhatsAppTextMessage(message.from, result.reply);

        await prisma.message.update({
          where: { id: result.assistantMessageId },
          data: { whatsappMessageId: sent.messageId, deliveryStatus: "SENT" },
        });
      } catch (error) {
        console.error("[whatsapp/webhook] failed to process incoming message", error);
      }
    }
  }

  return NextResponse.json({ ok: true });
}
