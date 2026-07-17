import { describe, expect, it, vi, beforeEach } from "vitest";

const mockPrisma = {
  lead: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  consultation: { create: vi.fn() },
};
vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

const mockRescoreLead = vi.fn();
vi.mock("@/services/lead-scoring", () => ({
  rescoreLead: (...args: unknown[]) => mockRescoreLead(...args),
}));

const { findOrCreateLeadForContact, bookConsultation } = await import("./consultation-service");

describe("findOrCreateLeadForContact", () => {
  beforeEach(() => vi.resetAllMocks());

  it("returns the existing lead matched by WhatsApp number without creating a new one", async () => {
    mockPrisma.lead.findUnique.mockResolvedValueOnce({ id: "lead_existing" });

    const lead = await findOrCreateLeadForContact({
      whatsappNumber: "15550123456",
      source: "WHATSAPP",
    });

    expect(lead).toEqual({ id: "lead_existing" });
    expect(mockPrisma.lead.create).not.toHaveBeenCalled();
  });

  it("falls back to matching by session id when there is no WhatsApp match", async () => {
    mockPrisma.lead.findUnique
      .mockResolvedValueOnce(null) // whatsappNumber lookup misses
      .mockResolvedValueOnce({ id: "lead_by_session" }); // sessionId lookup hits

    const lead = await findOrCreateLeadForContact({
      whatsappNumber: "15550123456",
      sessionId: "sess_1",
      source: "WHATSAPP",
    });

    expect(lead).toEqual({ id: "lead_by_session" });
    expect(mockPrisma.lead.create).not.toHaveBeenCalled();
  });

  it("creates a brand new lead when nothing matches", async () => {
    mockPrisma.lead.findUnique.mockResolvedValue(null);
    mockPrisma.lead.create.mockResolvedValueOnce({ id: "lead_new" });

    const lead = await findOrCreateLeadForContact({
      email: "jane@example.com",
      phone: "15550123456",
      name: "Jane",
      source: "WEBSITE",
    });

    expect(lead).toEqual({ id: "lead_new" });
    expect(mockPrisma.lead.create).toHaveBeenCalledWith({
      data: {
        sessionId: undefined,
        whatsappNumber: undefined,
        email: "jane@example.com",
        phone: "15550123456",
        name: "Jane",
        source: "WEBSITE",
      },
    });
  });
});

describe("bookConsultation", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockRescoreLead.mockResolvedValue({ score: 60, tier: "WARM", reason: "" });
    mockPrisma.consultation.create.mockResolvedValue({ id: "consult_1" });
    mockPrisma.lead.update.mockResolvedValue({});
  });

  it("creates (not finds) a lead when no leadId is given, then books the consultation against it", async () => {
    mockPrisma.lead.findUnique.mockResolvedValue(null);
    mockPrisma.lead.create.mockResolvedValueOnce({ id: "lead_created" });

    const consultation = await bookConsultation({
      sessionId: "sess_1",
      email: "jane@example.com",
      phone: "15550123456",
      name: "Jane",
      preferredDate: "2026-08-01",
      preferredTime: "3pm",
    });

    expect(consultation).toEqual({ id: "consult_1" });
    expect(mockPrisma.consultation.create).toHaveBeenCalledWith({
      data: {
        leadId: "lead_created",
        sessionId: "sess_1",
        preferredDate: "2026-08-01",
        preferredTime: "3pm",
        email: "jane@example.com",
        phone: "15550123456",
        notes: undefined,
        status: "REQUESTED",
      },
    });
  });

  it("reuses an existing leadId, updates its contact info, and still books the consultation", async () => {
    const consultation = await bookConsultation({
      leadId: "lead_existing",
      email: "new-email@example.com",
      phone: "15559999999",
      preferredDate: "2026-08-02",
      preferredTime: "10am",
    });

    expect(consultation).toEqual({ id: "consult_1" });
    expect(mockPrisma.lead.update).toHaveBeenNthCalledWith(1, {
      where: { id: "lead_existing" },
      data: { email: "new-email@example.com", phone: "15559999999", name: undefined },
    });
    // Lead never re-created via findOrCreateLeadForContact when a leadId is already provided.
    expect(mockPrisma.lead.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.lead.create).not.toHaveBeenCalled();
  });

  it("marks the lead CONSULTATION_BOOKED and rescoring runs afterwards", async () => {
    await bookConsultation({
      leadId: "lead_1",
      email: "jane@example.com",
      phone: "15550123456",
      preferredDate: "2026-08-01",
      preferredTime: "3pm",
    });

    expect(mockPrisma.lead.update).toHaveBeenNthCalledWith(2, {
      where: { id: "lead_1" },
      data: { status: "CONSULTATION_BOOKED", decisionReadiness: "ready_to_book" },
    });
    expect(mockRescoreLead).toHaveBeenCalledWith("lead_1");
  });
});
