import { describe, expect, it, vi, beforeEach } from "vitest";

const mockPrisma = {
  message: { findMany: vi.fn(), create: vi.fn() },
  conversation: { update: vi.fn() },
};
vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

const mockResponsesCreate = vi.fn();
vi.mock("@/services/openai-client", () => ({
  getOpenAIClient: () => ({ responses: { create: mockResponsesCreate } }),
  AI_MODEL: "gpt-5-test",
}));

const mockApplyLeadQualification = vi.fn();
vi.mock("@/services/lead-scoring", () => ({
  applyLeadQualification: (...args: unknown[]) => mockApplyLeadQualification(...args),
}));

const mockBookConsultation = vi.fn();
vi.mock("@/services/consultation-service", () => ({
  bookConsultation: (...args: unknown[]) => mockBookConsultation(...args),
}));

const { runAssistantTurn } = await import("./ai-designer");

const BASE_CONTEXT = {
  channel: "WEBSITE_CHAT" as const,
  visitorName: null,
  selectedStyle: null,
  selectedRoomType: null,
  uploadedImageDescription: null,
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

function textResponse(id: string, text: string) {
  return { id, output: [], output_text: text };
}

function functionCallResponse(
  id: string,
  calls: Array<{ name: string; call_id: string; arguments: Record<string, unknown> }>
) {
  return {
    id,
    output_text: "",
    output: calls.map((c) => ({
      type: "function_call" as const,
      name: c.name,
      call_id: c.call_id,
      arguments: JSON.stringify(c.arguments),
    })),
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
    mockResponsesCreate.mockResolvedValueOnce(textResponse("resp_1", "Scandinavian could work great here."));

    await runAssistantTurn({
      conversationId: "conv_1",
      leadId: "lead_1",
      sessionId: "sess_1",
      context: BASE_CONTEXT,
      userMessage: "I like Scandinavian style.",
    });

    expect(mockResponsesCreate).toHaveBeenCalledTimes(1);
    const call = mockResponsesCreate.mock.calls[0][0];
    expect(call.input).toEqual([
      { role: "user", content: "I have a small living room." },
      { role: "assistant", content: "Got it — what style are you drawn to?" },
      { role: "user", content: "I like Scandinavian style." },
    ]);
  });

  it("persists the user message before calling the model and the assistant reply after", async () => {
    mockPrisma.message.findMany.mockResolvedValueOnce([]);
    mockResponsesCreate.mockResolvedValueOnce(textResponse("resp_1", "Happy to help with that!"));

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

    mockResponsesCreate
      .mockResolvedValueOnce(
        functionCallResponse("resp_1", [
          { name: "update_lead_profile", call_id: "call_1", arguments: { budget: "2k_10k", roomType: "Kitchen" } },
        ])
      )
      .mockResolvedValueOnce(textResponse("resp_2", "Great, a mid-range kitchen refresh is very doable!"));

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

    // Second call must chain off the first response and submit the tool output.
    expect(mockResponsesCreate).toHaveBeenCalledTimes(2);
    const secondCall = mockResponsesCreate.mock.calls[1][0];
    expect(secondCall.previous_response_id).toBe("resp_1");
    expect(secondCall.input).toEqual([
      { type: "function_call_output", call_id: "call_1", output: JSON.stringify({ ok: true, tier: "WARM" }) },
    ]);
  });

  it("executes a book_consultation tool call and reports it in the result", async () => {
    mockPrisma.message.findMany.mockResolvedValueOnce([]);
    mockBookConsultation.mockResolvedValueOnce({ id: "consult_9" });

    mockResponsesCreate
      .mockResolvedValueOnce(
        functionCallResponse("resp_1", [
          {
            name: "book_consultation",
            call_id: "call_1",
            arguments: {
              preferredDate: "2026-08-01",
              preferredTime: "3pm",
              email: "jane@example.com",
              phone: "+15550123456",
            },
          },
        ])
      )
      .mockResolvedValueOnce(textResponse("resp_2", "You're booked for August 1st at 3pm!"));

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

    mockResponsesCreate
      .mockResolvedValueOnce(
        functionCallResponse("resp_1", [
          { name: "update_lead_profile", call_id: "call_1", arguments: { timeline: "just_browsing" } },
        ])
      )
      .mockResolvedValueOnce(
        functionCallResponse("resp_2", [
          {
            name: "book_consultation",
            call_id: "call_2",
            arguments: {
              preferredDate: "tomorrow",
              preferredTime: "morning",
              email: "a@b.com",
              phone: "123",
            },
          },
        ])
      )
      .mockResolvedValueOnce(textResponse("resp_3", "All set — see you then!"));

    const result = await runAssistantTurn({
      conversationId: "conv_1",
      leadId: "lead_1",
      sessionId: null,
      context: BASE_CONTEXT,
      userMessage: "Just browsing, but let's book anyway.",
    });

    expect(mockResponsesCreate).toHaveBeenCalledTimes(3);
    expect(result.leadProfileUpdated).toBe(true);
    expect(result.bookedConsultation).toBe(true);
    expect(result.reply).toBe("All set — see you then!");
  });

  it("does not let a failing tool call crash the turn — reports the error back to the model instead", async () => {
    mockPrisma.message.findMany.mockResolvedValueOnce([]);
    mockBookConsultation.mockRejectedValueOnce(new Error("email is required"));

    mockResponsesCreate
      .mockResolvedValueOnce(
        functionCallResponse("resp_1", [
          {
            name: "book_consultation",
            call_id: "call_1",
            arguments: { preferredDate: "tomorrow", preferredTime: "morning", email: "", phone: "" },
          },
        ])
      )
      .mockResolvedValueOnce(textResponse("resp_2", "Looks like I still need your email and phone."));

    const result = await runAssistantTurn({
      conversationId: "conv_1",
      leadId: "lead_1",
      sessionId: "sess_1",
      context: BASE_CONTEXT,
      userMessage: "Book me in.",
    });

    expect(result.bookedConsultation).toBe(false);
    const secondCall = mockResponsesCreate.mock.calls[1][0];
    expect(secondCall.input[0].output).toContain('"ok":false');
    expect(secondCall.input[0].output).toContain("email is required");
  });

  it("falls back to a holding reply when the model returns no output_text", async () => {
    mockPrisma.message.findMany.mockResolvedValueOnce([]);
    mockResponsesCreate.mockResolvedValueOnce({ id: "resp_1", output: [], output_text: "" });

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
