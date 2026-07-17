import { createHmac } from "crypto";
import { NextRequest } from "next/server";
import { describe, expect, it, vi, beforeEach } from "vitest";

const APP_SECRET = "webhook-test-secret";
const VERIFY_TOKEN = "webhook-verify-token";

const mockPrisma = {
  message: { updateMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
};
vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

const mockGetOrCreateWhatsAppConversation = vi.fn();
vi.mock("@/services/conversation-service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/conversation-service")>();
  return {
    ...actual,
    getOrCreateWhatsAppConversation: (...args: unknown[]) =>
      mockGetOrCreateWhatsAppConversation(...args),
  };
});

const mockBuildAIContextForSession = vi.fn();
vi.mock("@/services/context-builder", () => ({
  buildAIContextForSession: (...args: unknown[]) => mockBuildAIContextForSession(...args),
}));

const mockRunAssistantTurn = vi.fn();
vi.mock("@/services/ai-designer", () => ({
  runAssistantTurn: (...args: unknown[]) => mockRunAssistantTurn(...args),
}));

const mockSendWhatsAppTextMessage = vi.fn();
vi.mock("@/services/whatsapp-cloud", () => ({
  sendWhatsAppTextMessage: (...args: unknown[]) => mockSendWhatsAppTextMessage(...args),
}));

const { GET, POST } = await import("./route");

function sign(body: string) {
  return `sha256=${createHmac("sha256", APP_SECRET).update(body, "utf8").digest("hex")}`;
}

function postRequest(body: object, { signed = true } = {}) {
  const raw = JSON.stringify(body);
  return new NextRequest("http://localhost/api/whatsapp/webhook", {
    method: "POST",
    body: raw,
    headers: signed ? { "x-hub-signature-256": sign(raw) } : {},
  });
}

function incomingMessagePayload(overrides: Partial<{ id: string; from: string; body: string }> = {}) {
  return {
    entry: [
      {
        changes: [
          {
            value: {
              contacts: [{ profile: { name: "Jane Doe" } }],
              messages: [
                {
                  id: overrides.id ?? "wamid.1",
                  from: overrides.from ?? "15550123456",
                  timestamp: "1700000000",
                  type: "text",
                  text: { body: overrides.body ?? "Hi, I have a question." },
                },
              ],
            },
          },
        ],
      },
    ],
  };
}

describe("WhatsApp webhook GET (subscription verification)", () => {
  beforeEach(() => {
    vi.stubEnv("WHATSAPP_WEBHOOK_VERIFY_TOKEN", VERIFY_TOKEN);
  });

  it("echoes the challenge when mode and token are correct", async () => {
    const url = `http://localhost/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=${VERIFY_TOKEN}&hub.challenge=12345`;
    const response = await GET(new NextRequest(url));
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("12345");
  });

  it("rejects an incorrect verify token", async () => {
    const url = `http://localhost/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=12345`;
    const response = await GET(new NextRequest(url));
    expect(response.status).toBe(403);
  });
});

describe("WhatsApp webhook POST (incoming messages)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("WHATSAPP_APP_SECRET", APP_SECRET);

    mockPrisma.message.findUnique.mockResolvedValue(null); // not already processed
    mockPrisma.message.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.message.update.mockResolvedValue({});
    mockGetOrCreateWhatsAppConversation.mockResolvedValue({
      session: { id: "sess_1" },
      lead: { id: "lead_1", sessionId: "sess_1" },
      conversation: { id: "conv_1" },
    });
    mockBuildAIContextForSession.mockResolvedValue({ channel: "WHATSAPP" });
    mockRunAssistantTurn.mockResolvedValue({
      reply: "Happy to help!",
      bookedConsultation: false,
      leadProfileUpdated: false,
      assistantMessageId: "msg_9",
    });
    mockSendWhatsAppTextMessage.mockResolvedValue({ messageId: "wamid.reply" });
  });

  it("rejects a request with an invalid or missing signature before touching any service", async () => {
    const response = await POST(postRequest(incomingMessagePayload(), { signed: false }));
    expect(response.status).toBe(401);
    expect(mockGetOrCreateWhatsAppConversation).not.toHaveBeenCalled();
    expect(mockRunAssistantTurn).not.toHaveBeenCalled();
  });

  it("processes a valid incoming message end-to-end and sends the AI reply back", async () => {
    const response = await POST(
      postRequest(incomingMessagePayload({ id: "wamid.42", from: "15559876543", body: "What's the price?" }))
    );

    expect(response.status).toBe(200);
    expect(mockGetOrCreateWhatsAppConversation).toHaveBeenCalledWith({
      whatsappPhone: "15559876543",
      rawMessage: "What's the price?",
      profileName: "Jane Doe",
    });
    expect(mockRunAssistantTurn).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: "conv_1",
        leadId: "lead_1",
        sessionId: "sess_1",
        userMessage: "What's the price?",
        incomingWhatsappMessageId: "wamid.42",
      })
    );
    expect(mockSendWhatsAppTextMessage).toHaveBeenCalledWith("15559876543", "Happy to help!");
    expect(mockPrisma.message.update).toHaveBeenCalledWith({
      where: { id: "msg_9" },
      data: { whatsappMessageId: "wamid.reply", deliveryStatus: "SENT" },
    });
  });

  it("strips the [ref: ...] session tag before sending the message to the AI", async () => {
    await POST(
      postRequest(
        incomingMessagePayload({
          body: "Hi! I'm interested in a kitchen. [ref: 8f14e45f-ceea-467e-b7e1-52d6f6ed48c1]",
        })
      )
    );

    expect(mockRunAssistantTurn).toHaveBeenCalledWith(
      expect.objectContaining({ userMessage: "Hi! I'm interested in a kitchen." })
    );
  });

  it("is idempotent: does not reprocess a message whose whatsappMessageId was already handled", async () => {
    mockPrisma.message.findUnique.mockResolvedValueOnce({ id: "existing_msg" });

    const response = await POST(postRequest(incomingMessagePayload({ id: "wamid.dup" })));

    expect(response.status).toBe(200);
    expect(mockGetOrCreateWhatsAppConversation).not.toHaveBeenCalled();
    expect(mockRunAssistantTurn).not.toHaveBeenCalled();
    expect(mockSendWhatsAppTextMessage).not.toHaveBeenCalled();
  });

  it("ignores non-text message types without crashing", async () => {
    const payload = {
      entry: [
        {
          changes: [
            {
              value: {
                messages: [{ id: "wamid.img", from: "15550123456", timestamp: "1700000000", type: "image" }],
              },
            },
          ],
        },
      ],
    };

    const response = await POST(postRequest(payload));
    expect(response.status).toBe(200);
    expect(mockRunAssistantTurn).not.toHaveBeenCalled();
  });

  it("maps delivery status callbacks onto the matching stored message", async () => {
    const payload = {
      entry: [
        {
          changes: [
            { value: { statuses: [{ id: "wamid.reply", status: "delivered" }] } },
          ],
        },
      ],
    };

    await POST(postRequest(payload));

    expect(mockPrisma.message.updateMany).toHaveBeenCalledWith({
      where: { whatsappMessageId: "wamid.reply" },
      data: { deliveryStatus: "DELIVERED" },
    });
  });

  it("does not fail the whole webhook if the AI turn throws for one message", async () => {
    mockRunAssistantTurn.mockRejectedValueOnce(new Error("OpenAI is down"));

    const response = await POST(postRequest(incomingMessagePayload()));

    expect(response.status).toBe(200);
    expect(mockSendWhatsAppTextMessage).not.toHaveBeenCalled();
  });
});
