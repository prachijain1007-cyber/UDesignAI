import { createHmac } from "crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { verifyWhatsAppSignature } from "./whatsapp-signature";

const APP_SECRET = "unit-test-app-secret";

function sign(body: string, secret = APP_SECRET): string {
  return `sha256=${createHmac("sha256", secret).update(body, "utf8").digest("hex")}`;
}

describe("verifyWhatsAppSignature", () => {
  beforeEach(() => {
    vi.stubEnv("WHATSAPP_APP_SECRET", APP_SECRET);
  });

  it("accepts a correctly signed payload", () => {
    const body = JSON.stringify({ entry: [{ id: "123" }] });
    expect(verifyWhatsAppSignature(body, sign(body))).toBe(true);
  });

  it("rejects a payload signed with the wrong secret", () => {
    const body = JSON.stringify({ entry: [{ id: "123" }] });
    expect(verifyWhatsAppSignature(body, sign(body, "wrong-secret"))).toBe(false);
  });

  it("rejects a tampered body that no longer matches the signature", () => {
    const original = JSON.stringify({ entry: [{ id: "123" }] });
    const signature = sign(original);
    const tampered = JSON.stringify({ entry: [{ id: "456" }] });
    expect(verifyWhatsAppSignature(tampered, signature)).toBe(false);
  });

  it("rejects when the signature header is missing", () => {
    expect(verifyWhatsAppSignature("{}", null)).toBe(false);
  });

  it("rejects when WHATSAPP_APP_SECRET is not configured", () => {
    vi.stubEnv("WHATSAPP_APP_SECRET", "");
    const body = "{}";
    expect(verifyWhatsAppSignature(body, sign(body))).toBe(false);
  });

  it("rejects a malformed/short signature without throwing", () => {
    expect(verifyWhatsAppSignature("{}", "sha256=not-hex")).toBe(false);
    expect(verifyWhatsAppSignature("{}", "sha256=ab")).toBe(false);
  });
});
