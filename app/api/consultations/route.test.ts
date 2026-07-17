import { NextRequest } from "next/server";
import { describe, expect, it, vi, beforeEach } from "vitest";

const mockPrisma = { visitorSession: { upsert: vi.fn() } };
vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

const mockFindOrCreateLeadForContact = vi.fn();
const mockBookConsultation = vi.fn();
vi.mock("@/services/consultation-service", () => ({
  findOrCreateLeadForContact: (...args: unknown[]) => mockFindOrCreateLeadForContact(...args),
  bookConsultation: (...args: unknown[]) => mockBookConsultation(...args),
}));

const { POST } = await import("./route");

const VALID_BODY = {
  name: "Jane Doe",
  email: "jane@example.com",
  phone: "+15550123456",
  preferredDate: "2026-08-01",
  preferredTime: "15:00",
};

function request(body: unknown, ip = "203.0.113.5") {
  return new NextRequest("http://localhost/api/consultations", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "x-forwarded-for": ip },
  });
}

describe("POST /api/consultations", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockPrisma.visitorSession.upsert.mockResolvedValue({ id: "sess_1" });
    mockFindOrCreateLeadForContact.mockResolvedValue({ id: "lead_1" });
    mockBookConsultation.mockResolvedValue({ id: "consult_1" });
  });

  it("books a consultation for a valid request", async () => {
    const response = await POST(request(VALID_BODY, "198.51.100.1"));
    expect(response.status).toBe(201);
  });

  it("rate-limits a single IP after 5 requests within a minute", async () => {
    const ip = "198.51.100.2";
    for (let i = 0; i < 5; i++) {
      const response = await POST(request(VALID_BODY, ip));
      expect(response.status).toBe(201);
    }

    const sixth = await POST(request(VALID_BODY, ip));
    expect(sixth.status).toBe(429);
    expect(mockBookConsultation).toHaveBeenCalledTimes(5);
  });

  it("does not rate-limit a different IP", async () => {
    const ip = "198.51.100.3";
    for (let i = 0; i < 5; i++) await POST(request(VALID_BODY, ip));

    const fromAnotherIp = await POST(request(VALID_BODY, "198.51.100.4"));
    expect(fromAnotherIp.status).toBe(201);
  });
});
