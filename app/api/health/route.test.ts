import { describe, expect, it, vi, beforeEach } from "vitest";

const mockPrisma = { $queryRaw: vi.fn() };
vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

const { GET } = await import("./route");

describe("GET /api/health", () => {
  beforeEach(() => vi.resetAllMocks());

  it("returns 200 and status ok when the database responds", async () => {
    mockPrisma.$queryRaw.mockResolvedValueOnce([{ "?column?": 1 }]);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.database).toBe("ok");
    expect(typeof body.responseTimeMs).toBe("number");
  });

  it("returns 503 and status error when the database is unreachable", async () => {
    mockPrisma.$queryRaw.mockRejectedValueOnce(new Error("connection refused"));

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.status).toBe("error");
    expect(body.database).toBe("unreachable");
  });
});
