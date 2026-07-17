import { describe, expect, it } from "vitest";
import { buildWhatsAppContextMessage, buildWhatsAppLink } from "./whatsapp-context";
import type { ClientSessionContext } from "@/types/session";

const SESSION_TOKEN = "8f14e45f-ceea-467e-b7e1-52d6f6ed48c1";

function baseContext(overrides: Partial<ClientSessionContext> = {}): ClientSessionContext {
  return {
    sessionToken: SESSION_TOKEN,
    firstVisitAt: new Date().toISOString(),
    visitedPaths: ["/"],
    ...overrides,
  };
}

describe("buildWhatsAppContextMessage", () => {
  it("prioritizes a generated design summary above everything else", () => {
    const message = buildWhatsAppContextMessage(
      baseContext({
        lastGeneratedDesignSummary: "a Scandinavian Kitchen design",
        selectedStyle: "Industrial",
        uploadedImage: true,
        viewedPricing: true,
      })
    );
    expect(message).toContain("I just generated a Scandinavian Kitchen design");
  });

  it("falls back to style + room when there is no generated design", () => {
    const message = buildWhatsAppContextMessage(
      baseContext({ selectedStyle: "Scandinavian", selectedRoomType: "Kitchen" })
    );
    expect(message).toContain("Scandinavian Kitchen");
  });

  it("falls back to uploaded photo when there is no style/design", () => {
    const message = buildWhatsAppContextMessage(baseContext({ uploadedImage: true }));
    expect(message).toContain("uploaded a photo");
  });

  it("falls back to a generic greeting with no context at all", () => {
    const message = buildWhatsAppContextMessage(baseContext());
    expect(message).toContain("I'd love to learn more");
  });

  it("always appends the session ref tag so the webhook can link the chat", () => {
    const message = buildWhatsAppContextMessage(baseContext());
    expect(message).toContain(`[ref: ${SESSION_TOKEN}]`);
  });
});

describe("buildWhatsAppLink", () => {
  it("strips non-digit characters from the phone number", () => {
    const link = buildWhatsAppLink("+1 (555) 012-3456", "hello");
    expect(link).toBe("https://wa.me/15550123456?text=hello");
  });

  it("URL-encodes the message text", () => {
    const link = buildWhatsAppLink("15550123456", "Hi! I'm interested [ref: abc]");
    expect(link).toContain(encodeURIComponent("Hi! I'm interested [ref: abc]"));
  });
});
