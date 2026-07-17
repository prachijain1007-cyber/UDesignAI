import { describe, expect, it, vi, beforeEach } from "vitest";

const mockPrisma = {
  lead: { findUniqueOrThrow: vi.fn(), update: vi.fn() },
  leadScoreHistory: { create: vi.fn() },
  $transaction: vi.fn((ops: unknown[]) => Promise.all(ops)),
};

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

const { rescoreLead, applyLeadQualification } = await import("./lead-scoring");

describe("rescoreLead", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockPrisma.$transaction.mockImplementation((ops: unknown[]) => Promise.all(ops));
    mockPrisma.lead.update.mockResolvedValue({});
    mockPrisma.leadScoreHistory.create.mockResolvedValue({});
  });

  it("reads the lead's qualification fields and persists the computed score/tier", async () => {
    mockPrisma.lead.findUniqueOrThrow.mockResolvedValueOnce({
      id: "lead_1",
      budget: "50k_plus",
      timeline: "immediately",
      urgency: "high",
      projectSize: null,
      ownership: "OWNER",
      decisionReadiness: null,
    });

    const result = await rescoreLead("lead_1");

    // 30 + 25 + 15 + 10 = 80 -> HOT
    expect(result.score).toBe(80);
    expect(result.tier).toBe("HOT");

    expect(mockPrisma.lead.update).toHaveBeenCalledWith({
      where: { id: "lead_1" },
      data: { score: 80, tier: "HOT" },
    });
    expect(mockPrisma.leadScoreHistory.create).toHaveBeenCalledWith({
      data: { leadId: "lead_1", score: 80, tier: "HOT", reason: result.reason },
    });
  });

  it("writes both the lead update and the score history entry inside one transaction", async () => {
    mockPrisma.lead.findUniqueOrThrow.mockResolvedValueOnce({
      id: "lead_2",
      budget: null,
      timeline: null,
      urgency: null,
      projectSize: null,
      ownership: null,
      decisionReadiness: null,
    });

    await rescoreLead("lead_2");

    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    const opsPassedToTransaction = mockPrisma.$transaction.mock.calls[0][0];
    expect(opsPassedToTransaction).toHaveLength(2);
  });
});

describe("applyLeadQualification", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockPrisma.$transaction.mockImplementation((ops: unknown[]) => Promise.all(ops));
    mockPrisma.lead.update.mockResolvedValue({});
    mockPrisma.leadScoreHistory.create.mockResolvedValue({});
  });

  it("marks the lead QUALIFIED and writes the qualification fields before rescoring", async () => {
    mockPrisma.lead.findUniqueOrThrow.mockResolvedValueOnce({
      id: "lead_3",
      budget: "10k_50k",
      timeline: "1_3_months",
      urgency: "medium",
      projectSize: "multi_room",
      ownership: "RENTER",
      decisionReadiness: "comparing_options",
    });

    await applyLeadQualification("lead_3", {
      budget: "10k_50k",
      timeline: "1_3_months",
      urgency: "medium",
      projectSize: "multi_room",
      ownership: "RENTER",
      decisionReadiness: "comparing_options",
      email: "visitor@example.com",
    });

    // First call to lead.update is the qualification write (status QUALIFIED);
    // the second is the score/tier write made by rescoreLead.
    expect(mockPrisma.lead.update).toHaveBeenNthCalledWith(1, {
      where: { id: "lead_3" },
      data: expect.objectContaining({ status: "QUALIFIED", email: "visitor@example.com" }),
    });
    expect(mockPrisma.lead.findUniqueOrThrow).toHaveBeenCalledWith({ where: { id: "lead_3" } });
  });
});
