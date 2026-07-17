import { describe, expect, it, vi, beforeEach } from "vitest";

const mockPrisma = {
  visitorSession: { count: vi.fn(), findMany: vi.fn() },
  lead: { count: vi.fn(), findMany: vi.fn(), groupBy: vi.fn() },
  conversation: { count: vi.fn() },
  consultation: { count: vi.fn() },
  websiteEvent: { findMany: vi.fn() },
  generatedDesign: { findMany: vi.fn() },
};

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

// Imported after the mock so the module under test picks up the mocked client.
const { getDashboardAnalytics } = await import("./analytics-service");

function mockHappyPathData() {
  mockPrisma.visitorSession.count
    .mockResolvedValueOnce(200) // totalSessions
    .mockResolvedValueOnce(40); // whatsappClickedSessions

  mockPrisma.lead.count
    .mockResolvedValueOnce(50) // totalLeads
    .mockResolvedValueOnce(5) // todaysLeads
    .mockResolvedValueOnce(10) // hotLeads
    .mockResolvedValueOnce(15) // warmLeads
    .mockResolvedValueOnce(25); // coldLeads

  mockPrisma.conversation.count.mockResolvedValueOnce(30); // aiConversations
  mockPrisma.consultation.count.mockResolvedValueOnce(8); // bookings

  mockPrisma.lead.findMany.mockResolvedValueOnce([
    { source: "WEBSITE", dealValue: 1500 },
    { source: "WEBSITE", dealValue: 2500 },
    { source: "WHATSAPP", dealValue: 800 },
    { source: "MANUAL", dealValue: null },
  ]); // wonLeads

  mockPrisma.lead.groupBy.mockResolvedValueOnce([
    { source: "WEBSITE", _count: { _all: 30 } },
    { source: "WHATSAPP", _count: { _all: 18 } },
    { source: "MANUAL", _count: { _all: 2 } },
  ]);

  mockPrisma.visitorSession.findMany.mockResolvedValueOnce([
    { timeOnSiteMs: 60_000 },
    { timeOnSiteMs: 30_000 },
    { timeOnSiteMs: 90_000 },
  ]);

  mockPrisma.websiteEvent.findMany
    .mockResolvedValueOnce([
      { metadata: { cta: "hero-generate" } },
      { metadata: { cta: "hero-generate" } },
      { metadata: { cta: "pricing-plan" } },
      { metadata: null },
    ]) // ctaEvents
    .mockResolvedValueOnce([{ path: "/" }, { path: "/" }, { path: "/studio" }, { path: null }]); // pageViewEvents

  mockPrisma.generatedDesign.findMany.mockResolvedValueOnce([
    { roomType: "Living Room", style: "Modern Minimalist" },
    { roomType: "Living Room", style: "Scandinavian" },
    { roomType: "Kitchen", style: "Modern Minimalist" },
  ]);
}

function mockEmptyData() {
  mockPrisma.visitorSession.count.mockResolvedValueOnce(0).mockResolvedValueOnce(0);
  mockPrisma.lead.count
    .mockResolvedValueOnce(0)
    .mockResolvedValueOnce(0)
    .mockResolvedValueOnce(0)
    .mockResolvedValueOnce(0)
    .mockResolvedValueOnce(0);
  mockPrisma.conversation.count.mockResolvedValueOnce(0);
  mockPrisma.consultation.count.mockResolvedValueOnce(0);
  mockPrisma.lead.findMany.mockResolvedValueOnce([]);
  mockPrisma.lead.groupBy.mockResolvedValueOnce([]);
  mockPrisma.visitorSession.findMany.mockResolvedValueOnce([]);
  mockPrisma.websiteEvent.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
  mockPrisma.generatedDesign.findMany.mockResolvedValueOnce([]);
}

describe("getDashboardAnalytics", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("computes conversion and booking rates correctly", async () => {
    mockHappyPathData();
    const result = await getDashboardAnalytics();
    // 50 leads / 200 sessions = 25.0%
    expect(result.conversionRate).toBe(25);
    // 8 bookings / 50 leads = 16.0%
    expect(result.bookingRate).toBe(16);
  });

  it("returns 0 rates instead of dividing by zero with no traffic", async () => {
    mockEmptyData();
    const result = await getDashboardAnalytics();
    expect(result.conversionRate).toBe(0);
    expect(result.bookingRate).toBe(0);
    expect(result.avgSessionDurationMs).toBe(0);
    expect(result.mostPopularRoom).toBeNull();
    expect(result.mostPopularStyle).toBeNull();
  });

  it("averages session duration across sessions with page views", async () => {
    mockHappyPathData();
    const result = await getDashboardAnalytics();
    // (60000 + 30000 + 90000) / 3 = 60000
    expect(result.avgSessionDurationMs).toBe(60_000);
  });

  it("aggregates CTA clicks by cta name, sorted descending, defaulting missing metadata to 'unknown'", async () => {
    mockHappyPathData();
    const result = await getDashboardAnalytics();
    expect(result.topCTAs).toEqual([
      { cta: "hero-generate", count: 2 },
      { cta: "pricing-plan", count: 1 },
      { cta: "unknown", count: 1 },
    ]);
  });

  it("aggregates page views by path, defaulting a null path to '/'", async () => {
    mockHappyPathData();
    const result = await getDashboardAnalytics();
    expect(result.topPages).toEqual([
      { path: "/", count: 3 },
      { path: "/studio", count: 1 },
    ]);
  });

  it("finds the most popular room and style from completed designs", async () => {
    mockHappyPathData();
    const result = await getDashboardAnalytics();
    expect(result.mostPopularRoom).toBe("Living Room");
    expect(result.mostPopularStyle).toBe("Modern Minimalist");
  });

  it("sums won-deal revenue by lead source, treating a null dealValue as 0", async () => {
    mockHappyPathData();
    const result = await getDashboardAnalytics();
    expect(result.revenueBySource).toEqual(
      expect.arrayContaining([
        { source: "WEBSITE", total: 4000 },
        { source: "WHATSAPP", total: 800 },
        { source: "MANUAL", total: 0 },
      ])
    );
  });

  it("reports the funnel using the same underlying counts", async () => {
    mockHappyPathData();
    const result = await getDashboardAnalytics();
    expect(result.funnel).toEqual({
      visitors: 200,
      leads: 50,
      consultationsBooked: 8,
      won: 4,
    });
  });
});
