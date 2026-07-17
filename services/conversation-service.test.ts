import { describe, expect, it } from "vitest";
import { extractSessionRef, stripSessionRef } from "./conversation-service";

const SESSION_UUID = "8f14e45f-ceea-467e-b7e1-52d6f6ed48c1";

describe("extractSessionRef", () => {
  it("extracts a session token from a well-formed ref tag", () => {
    const message = `Hi! I just generated a Modern Living Room design on UDesign AI. [ref: ${SESSION_UUID}]`;
    expect(extractSessionRef(message)).toBe(SESSION_UUID);
  });

  it("returns null when there is no ref tag", () => {
    expect(extractSessionRef("Hi, I have a question about pricing.")).toBeNull();
  });

  it("returns null for a ref tag that is too short to be a real session token", () => {
    expect(extractSessionRef("Hello [ref: abc123]")).toBeNull();
  });

  it("is case-insensitive on the 'ref:' label", () => {
    const message = `Hello [REF: ${SESSION_UUID}]`;
    expect(extractSessionRef(message)).toBe(SESSION_UUID);
  });
});

describe("stripSessionRef", () => {
  it("removes the ref tag and trims surrounding whitespace", () => {
    const message = `Hi! I'm interested in a Scandinavian Kitchen. [ref: ${SESSION_UUID}]`;
    expect(stripSessionRef(message)).toBe("Hi! I'm interested in a Scandinavian Kitchen.");
  });

  it("returns the original message unchanged when there is no ref tag", () => {
    const message = "What's included in the Design Consult package?";
    expect(stripSessionRef(message)).toBe(message);
  });
});
