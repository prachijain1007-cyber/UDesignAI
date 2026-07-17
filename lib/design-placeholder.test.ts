import { describe, expect, it } from "vitest";
import { buildPlaceholderDesignSvg, svgToDataBuffer } from "./design-placeholder";

describe("buildPlaceholderDesignSvg", () => {
  it("produces valid SVG containing the room type and style", () => {
    const svg = buildPlaceholderDesignSvg("Living Room", "Scandinavian");
    expect(svg).toContain("<svg");
    expect(svg).toContain("</svg>");
    expect(svg).toContain("Scandinavian Living Room");
  });

  it("escapes XML-special characters so untrusted-looking input can't break the markup", () => {
    const svg = buildPlaceholderDesignSvg('Living Room"><script>alert(1)</script>', "Modern");
    expect(svg).not.toContain("<script>");
    expect(svg).toContain("&lt;script&gt;");
  });

  it("falls back to a default gradient for an unrecognized style", () => {
    const svg = buildPlaceholderDesignSvg("Attic", "Some Made Up Style");
    expect(svg).toContain("<svg");
    expect(svg).toContain("Some Made Up Style Attic");
  });
});

describe("svgToDataBuffer", () => {
  it("round-trips the SVG string through a Buffer unchanged", () => {
    const svg = buildPlaceholderDesignSvg("Kitchen", "Coastal");
    const buffer = svgToDataBuffer(svg);
    expect(buffer.toString("utf8")).toBe(svg);
  });
});
