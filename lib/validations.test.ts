import { describe, expect, it } from "vitest";
import {
  trackEventSchema,
  aiChatRequestSchema,
  consultationRequestSchema,
  adminLoginSchema,
  leadUpdateSchema,
  leadNoteSchema,
} from "./validations";

describe("trackEventSchema", () => {
  it("accepts a minimal valid event", () => {
    const result = trackEventSchema.safeParse({ sessionToken: "abc", type: "PAGE_VIEW" });
    expect(result.success).toBe(true);
  });

  it("rejects an unknown event type", () => {
    const result = trackEventSchema.safeParse({ sessionToken: "abc", type: "NOT_A_REAL_EVENT" });
    expect(result.success).toBe(false);
  });

  it("rejects an empty sessionToken", () => {
    const result = trackEventSchema.safeParse({ sessionToken: "", type: "PAGE_VIEW" });
    expect(result.success).toBe(false);
  });

  it("rejects a negative timeOnPageMs", () => {
    const result = trackEventSchema.safeParse({
      sessionToken: "abc",
      type: "PAGE_VIEW",
      timeOnPageMs: -5,
    });
    expect(result.success).toBe(false);
  });
});

describe("aiChatRequestSchema", () => {
  it("rejects an empty message", () => {
    expect(aiChatRequestSchema.safeParse({ sessionToken: "abc", message: "" }).success).toBe(false);
  });

  it("rejects a message over 4000 characters", () => {
    const result = aiChatRequestSchema.safeParse({
      sessionToken: "abc",
      message: "a".repeat(4001),
    });
    expect(result.success).toBe(false);
  });

  it("accepts a normal chat message", () => {
    const result = aiChatRequestSchema.safeParse({
      sessionToken: "abc",
      message: "What's the price of a kitchen redesign?",
    });
    expect(result.success).toBe(true);
  });
});

describe("consultationRequestSchema", () => {
  const valid = {
    name: "Jane Doe",
    email: "jane@example.com",
    phone: "+15550123456",
    preferredDate: "2026-08-01",
    preferredTime: "15:00",
  };

  it("accepts a valid booking", () => {
    expect(consultationRequestSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects an invalid email", () => {
    expect(
      consultationRequestSchema.safeParse({ ...valid, email: "not-an-email" }).success
    ).toBe(false);
  });

  it("rejects a phone number that's too short", () => {
    expect(consultationRequestSchema.safeParse({ ...valid, phone: "12345" }).success).toBe(false);
  });

  it("rejects a missing name", () => {
    const withoutName: Partial<typeof valid> = { ...valid };
    delete withoutName.name;
    expect(consultationRequestSchema.safeParse(withoutName).success).toBe(false);
  });
});

describe("adminLoginSchema", () => {
  it("rejects a password shorter than 8 characters", () => {
    expect(
      adminLoginSchema.safeParse({ email: "admin@udesignai.com", password: "short" }).success
    ).toBe(false);
  });

  it("accepts a valid login payload", () => {
    expect(
      adminLoginSchema.safeParse({ email: "admin@udesignai.com", password: "longenoughpw" })
        .success
    ).toBe(true);
  });
});

describe("leadUpdateSchema", () => {
  it("accepts an empty patch (all fields optional)", () => {
    expect(leadUpdateSchema.safeParse({}).success).toBe(true);
  });

  it("accepts a null assignedToId to unassign a lead", () => {
    expect(leadUpdateSchema.safeParse({ assignedToId: null }).success).toBe(true);
  });

  it("rejects an invalid status value", () => {
    expect(leadUpdateSchema.safeParse({ status: "MADE_UP_STATUS" }).success).toBe(false);
  });
});

describe("leadNoteSchema", () => {
  it("rejects an empty note body", () => {
    expect(leadNoteSchema.safeParse({ body: "" }).success).toBe(false);
  });

  it("accepts a normal note", () => {
    expect(leadNoteSchema.safeParse({ body: "Called, left voicemail." }).success).toBe(true);
  });
});
