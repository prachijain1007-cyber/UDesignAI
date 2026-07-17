import { describe, expect, it, vi, beforeEach } from "vitest";

const mockPrisma = {
  message: { findMany: vi.fn(), create: vi.fn() },
  conversation: { update: vi.fn() },
};
vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

const mockGenerateContent = vi.fn();
vi.mock("@/services/gemini-client", () => ({
  getGeminiClient: () => ({ models: { generateContent: mockGenerateContent } }),
  AI_MODEL: "gemini-flash-latest-test",
}));

const mockApplyLeadQualification = vi.fn();
vi.mock("@/services/lead-scoring", () => ({
  applyLeadQualification: (...args: unknown[]) => mockApplyLeadQualification(...args),
}));

const mockBookConsultation = vi.fn();
vi.mock("@/services/consultation-service", () => ({
  bookConsultation: (...args: unknown[]) => mockBookConsultation(...args),
}));

const mockFetchFileBuffer = vi.fn();
vi.mock("@/lib/fetch-file-buffer", () => ({
  fetchFileBuffer: (...args: unknown[]) => mockFetchFileBuffer(...args),
}));

const { runAssistantTurn } = await import("./ai-designer");

const BASE_CONTEXT = {
  channel: "WEBSITE_CHAT" as const,
  visitorName: null,
  selectedStyle: null,
  selectedRoomType: null,
  uploadedImageDescription: null,
  uploadedImageUrl: null,
  uploadedImageMimeType: null,
  lastGeneratedDesignSummary: null,
  viewedPricing: false,
  viewedConsultation: false,
  knownEmail: null,
  knownPhone: null,
  budget: null,
  timeline: null,
  ownership: null,
  projectSize: null,
};

function textResponse(text: string) {
  return { text, functionCalls: undefined, candidates: [{ content: { role: "model", parts: [{ text }] } }] };
}

function functionCallResponse(calls: Array<{ name: string; args: Record<string, unknown> }>) {
  return {
    text: undefined,
    functionCalls: calls,
    candidates: [
      { content: { role: "model", parts: calls.map((c) => ({ functionCall: { name: c.name, args: c.args } })) } },
    ],
  };
}

describe("runAssistantTurn", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockPrisma.message.create.mockImplementation(async (args: { data: Record<string, unknown> }) => ({
      id: "msg_new",
      ...args.data,
    }));
    mockPrisma.conversation.update.mockResolvedValue({});
  });

  it("includes prior conversation history in the model input, preserving conversation memory", async () => {
    mockPrisma.message.findMany.mockResolvedValueOnce([
      { role: "USER", content: "I have a small living room." },
      { role: "ASSISTANT", content: "Got it — what style are you drawn to?" },
    ]);
    mockGenerateContent.mockResolvedValueOnce(textResponse("Scandinavian could work great here."));

    await runAssistantTurn({
      conversationId: "conv_1",
      leadId: "lead_1",
      sessionId: "sess_1",
      context: BASE_CONTEXT,
      userMessage: "I like Scandinavian style.",
    });

    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    const call = mockGenerateContent.mock.calls[0][0];
    expect(call.contents).toEqual([
      { role: "user", parts: [{ text: "I have a small living room." }] },
      { role: "model", parts: [{ text: "Got it — what style are you drawn to?" }] },
      { role: "user", parts: [{ text: "I like Scandinavian style." }] },
    ]);
  });

  it("attaches the uploaded room photo as inline image data for real image understanding", async () => {
    mockPrisma.message.findMany.mockResolvedValueOnce([]);
    mockFetchFileBuffer.mockResolvedValueOnce(Buffer.from("fake-jpeg-bytes"));
    mockGenerateContent.mockResolvedValueOnce(textResponse("I can see your living room — lovely natural light!"));

    await runAssistantTurn({
      conversationId: "conv_1",
      leadId: "lead_1",
      sessionId: "sess_1",
      context: {
        ...BASE_CONTEXT,
        uploadedImageUrl: "https://example.com/room.jpg",
        uploadedImageMimeType: "image/jpeg",
      },
      userMessage: "What do you think of my room?",
    });

    const call = mockGenerateContent.mock.calls[0][0];
    const lastMessageParts = call.contents.at(-1).parts;
    expect(lastMessageParts).toHaveLength(2);
    expect(lastMessageParts[0]).toEqual({ text: "What do you think of my room?" });
    expect(lastMessageParts[1].inlineData.mimeType).toBe("image/jpeg");
    expect(typeof lastMessageParts[1].inlineData.data).toBe("string");
  });

  it("persists the user message before calling the model and the assistant reply after", async () => {
    mockPrisma.message.findMany.mockResolvedValueOnce([]);
    mockGenerateContent.mockResolvedValueOnce(textResponse("Happy to help with that!"));

    const result = await runAssistantTurn({
      conversationId: "conv_1",
      leadId: "lead_1",
      sessionId: "sess_1",
      context: BASE_CONTEXT,
      userMessage: "What styles do you offer?",
      incomingWhatsappMessageId: "wamid.123",
    });

    expect(mockPrisma.message.create).toHaveBeenNthCalledWith(1, {
      data: {
        conversationId: "conv_1",
        role: "USER",
        content: "What styles do you offer?",
        whatsappMessageId: "wamid.123",
      },
    });
    expect(mockPrisma.message.create).toHaveBeenNthCalledWith(2, {
      data: { conversationId: "conv_1", role: "ASSISTANT", content: "Happy to help with that!" },
    });
    expect(result.reply).toBe("Happy to help with that!");
    expect(result.assistantMessageId).toBe("msg_new");
  });

  it("executes an update_lead_profile tool call and feeds the result back to the model", async () => {
    mockPrisma.message.findMany.mockResolvedValueOnce([]);
    mockApplyLeadQualification.mockResolvedValueOnce({ score: 55, tier: "WARM", reason: "budget=2k_10k" });

    mockGenerateContent
      .mockResolvedValueOnce(
        functionCallResponse([{ name: "update_lead_profile", args: { budget: "2k_10k", roomType: "Kitchen" } }])
      )
      .mockResolvedValueOnce(textResponse("Great, a mid-range kitchen refresh is very doable!"));

    const result = await runAssistantTurn({
      conversationId: "conv_1",
      leadId: "lead_42",
      sessionId: "sess_1",
      context: BASE_CONTEXT,
      userMessage: "My budget is around $5k for the kitchen.",
    });

    expect(mockApplyLeadQualification).toHaveBeenCalledWith(
      "lead_42",
      expect.objectContaining({ budget: "2k_10k", roomType: "Kitchen" })
    );
    expect(result.leadProfileUpdated).toBe(true);
    expect(result.bookedConsultation).toBe(false);
    expect(result.reply).toBe("Great, a mid-range kitchen refresh is very doable!");

    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    const secondCall = mockGenerateContent.mock.calls[1][0];
    const lastContent = secondCall.contents.at(-1);
    expect(lastContent).toEqual({
      role: "user",
      parts: [{ functionResponse: { name: "update_lead_profile", response: { ok: true, tier: "WARM" } } }],
    });
  });

  it("executes a book_consultation tool call and reports it in the result", async () => {
    mockPrisma.message.findMany.mockResolvedValueOnce([]);
    mockBookConsultation.mockResolvedValueOnce({ id: "consult_9" });

    mockGenerateContent
      .mockResolvedValueOnce(
        functionCallResponse([
          {
            name: "book_consultation",
            args: {
              preferredDate: "2026-08-01",
              preferredTime: "3pm",
              email: "jane@example.com",
              phone: "+15550123456",
            },
          },
        ])
      )
      .mockResolvedValueOnce(textResponse("You're booked for August 1st at 3pm!"));

    const result = await runAssistantTurn({
      conversationId: "conv_1",
      leadId: "lead_42",
      sessionId: "sess_1",
      context: BASE_CONTEXT,
      userMessage: "Let's book August 1st at 3pm, jane@example.com, +15550123456",
    });

    expect(mockBookConsultation).toHaveBeenCalledWith({
      leadId: "lead_42",
      sessionId: "sess_1",
      email: "jane@example.com",
      phone: "+15550123456",
      preferredDate: "2026-08-01",
      preferredTime: "3pm",
      notes: undefined,
    });
    expect(result.bookedConsultation).toBe(true);
  });

  it("handles multiple sequential tool-call rounds before producing a final reply", async () => {
    mockPrisma.message.findMany.mockResolvedValueOnce([]);
    mockApplyLeadQualification.mockResolvedValueOnce({ score: 20, tier: "COLD", reason: "timeline=just_browsing" });
    mockBookConsultation.mockResolvedValueOnce({ id: "consult_1" });

    mockGenerateContent
      .mockResolvedValueOnce(functionCallResponse([{ name: "update_lead_profile", args: { timeline: "just_browsing" } }]))
      .mockResolvedValueOnce(
        functionCallResponse([
          {
            name: "book_consultation",
            args: { preferredDate: "tomorrow", preferredTime: "morning", email: "a@b.com", phone: "123" },
          },
        ])
      )
      .mockResolvedValueOnce(textResponse("All set — see you then!"));

    const result = await runAssistantTurn({
      conversationId: "conv_1",
      leadId: "lead_1",
      sessionId: null,
      context: BASE_CONTEXT,
      userMessage: "Just browsing, but let's book anyway.",
    });

    expect(mockGenerateContent).toHaveBeenCalledTimes(3);
    expect(result.leadProfileUpdated).toBe(true);
    expect(result.bookedConsultation).toBe(true);
    expect(result.reply).toBe("All set — see you then!");
  });

  it("does not let a failing tool call crash the turn — reports the error back to the model instead", async () => {
    mockPrisma.message.findMany.mockResolvedValueOnce([]);
    mockBookConsultation.mockRejectedValueOnce(new Error("email is required"));

    mockGenerateContent
      .mockResolvedValueOnce(
        functionCallResponse([
          {
            name: "book_consultation",
            args: { preferredDate: "tomorrow", preferredTime: "morning", email: "", phone: "" },
          },
        ])
      )
      .mockResolvedValueOnce(textResponse("Looks like I still need your email and phone."));

    const result = await runAssistantTurn({
      conversationId: "conv_1",
      leadId: "lead_1",
      sessionId: "sess_1",
      context: BASE_CONTEXT,
      userMessage: "Book me in.",
    });

    expect(result.bookedConsultation).toBe(false);
    const secondCall = mockGenerateContent.mock.calls[1][0];
    const responsePart = secondCall.contents.at(-1).parts[0].functionResponse.response;
    expect(responsePart.ok).toBe(false);
    expect(responsePart.error).toContain("email is required");
  });

  it("falls back to a holding reply when the model returns no text", async () => {
    mockPrisma.message.findMany.mockResolvedValueOnce([]);
    mockGenerateContent.mockResolvedValueOnce({ text: undefined, functionCalls: undefined, candidates: [] });

    const result = await runAssistantTurn({
      conversationId: "conv_1",
      leadId: "lead_1",
      sessionId: "sess_1",
      context: BASE_CONTEXT,
      userMessage: "...",
    });

    expect(result.reply).toBe("I'm here and thinking through that — could you tell me a little more?");
  });
});
